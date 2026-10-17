import urllib.request
import re
import json
import os
import time
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CRAWLED_URLS_FILE = os.path.join(BASE_DIR, "data", "crawled_urls.json")
AUDIT_OUTPUT_FILE = os.path.join(BASE_DIR, "data", "reference_catalogue_audit.json")
PRODUCTS_JS_FILE = os.path.join(BASE_DIR, "data", "products.js")
DB_JSON_FILE = os.path.join(BASE_DIR, "data", "db.json")
REPORT_OUTPUT_FILE = os.path.join(BASE_DIR, "data", "price_sync_report.json")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cookie": "wixLanguage=en; currency=INR"
}

def fetch_page_with_retry(url, max_retries=3):
    inr_url = url + ("&currency=INR" if "?" in url else "?currency=INR")
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(inr_url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=15) as res:
                return res.read().decode("utf-8", errors="ignore")
        except urllib.error.HTTPError as e:
            if e.code == 429:
                sleep_time = 2 * (attempt + 1)
                time.sleep(sleep_time)
            elif attempt == max_retries - 1:
                return None
        except Exception:
            if attempt == max_retries - 1:
                return None
            time.sleep(1)
    return None

def extract_product_audit(url):
    slug = url.split("/product-page/")[-1].split("?")[0].strip()
    html = fetch_page_with_retry(url)
    if not html:
        return {
            "slug": slug,
            "referenceURL": url,
            "status": "ERROR_FETCH",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    # Title
    title = ""
    t_match = re.search(r"<title>(.*?)</title>", html)
    if t_match:
        title = t_match.group(1).split("|")[0].strip()

    # Ribbon (often contains model number or series, e.g. MI HEX 90, UltraPro 100, G COMBO 400)
    ribbon = ""
    r_match = re.search(r'\"ribbon\":\s*\"(.*?)\"', html)
    if r_match:
        ribbon = r_match.group(1).strip()

    # SKU
    sku = ""
    sku_match = re.search(r'\"sku\":\s*\"(.*?)\"', html)
    if sku_match:
        sku = sku_match.group(1).strip()

    # Brand
    brand = "SKRILIX"
    b_match = re.search(r'\"brand\":\s*\"(.*?)\"', html)
    if b_match:
        brand = b_match.group(1).strip()

    # Extract INR prices from Wix DOM hooks
    orig_inr = None
    sale_inr = None
    m_orig = re.search(r'data-wix-original-price=\"₹?([0-9,]+(?:\.[0-9]+)?)\"', html)
    if m_orig:
        try:
            orig_inr = float(m_orig.group(1).replace(",", ""))
        except ValueError:
            pass

    m_sale = re.search(r'data-wix-price=\"₹?([0-9,]+(?:\.[0-9]+)?)\"', html)
    if m_sale:
        try:
            sale_inr = float(m_sale.group(1).replace(",", ""))
        except ValueError:
            pass

    # Extract USD prices from JSON-LD or Wix state
    reg_usd = None
    sale_usd = None
    
    # Try comparePrice / price
    m_comp = re.search(r'\"comparePrice\":\s*([0-9\.]+)', html)
    m_p = re.search(r'\"price\":\s*([0-9\.]+)', html)
    m_pad = re.search(r'\"priceAfterDiscountAmount\":\s*([0-9\.]+)', html)

    # Note: If requested with currency=INR, Wix may output INR values in the JSON comparePrice!
    # Check if value in JSON is USD-scale (< 10,000 for equipment) or INR-scale
    raw_comp = float(m_comp.group(1)) if m_comp else None
    raw_p = float(m_p.group(1)) if m_p else None
    raw_pad = float(m_pad.group(1)) if m_pad else None

    # Derive exchange rate from INR / USD if both available, or standard Wix conversion rate
    # If raw_comp is in USD (< 10000 or matches known prices)
    if orig_inr and orig_inr > 0:
        if raw_comp and raw_comp > 5000 and abs(raw_comp - orig_inr) < 100:
            # Wix returned INR in the JSON comparePrice
            pass
        elif raw_comp and raw_comp > 0:
            reg_usd = raw_comp
        elif raw_p and raw_p > 0 and raw_p < 20000:
            reg_usd = raw_p

    if sale_inr and sale_inr > 0:
        if raw_pad and raw_pad > 5000 and abs(raw_pad - sale_inr) < 100:
            # Wix returned INR in raw_pad
            pass
        elif raw_pad and raw_pad > 0:
            sale_usd = raw_pad

    # If USD wasn't directly found in USD units, calculate from Wix live rate (approx 96.1758)
    if orig_inr:
        if not reg_usd:
            # Check if we can find JSON-LD price
            m_jld = re.search(r'\"priceCurrency\":\s*\"USD\",\s*\"price\":\s*\"([0-9\.]+)\"', html)
            if m_jld:
                reg_usd = float(m_jld.group(1))
            else:
                reg_usd = round(orig_inr / 96.17583, 2)
        if not sale_usd:
            if sale_inr and sale_inr < orig_inr:
                sale_usd = round(sale_inr / 96.17583, 2)
            else:
                sale_usd = reg_usd

    # Fallbacks and normalization
    if orig_inr is None and sale_inr is not None:
        orig_inr = sale_inr
    if sale_inr is None and orig_inr is not None:
        sale_inr = orig_inr

    has_discount = bool(orig_inr and sale_inr and sale_inr < orig_inr)

    # Determine category
    comb = f"{slug} {title} {ribbon}".lower()
    if any(k in comb for k in ["ot light", "surgical light", "operation theater light", "dome ot", "shadowless led", "examination light", "headlight", "surgibeam", "lumina", "star 84", "star 105", "rish", "alo", "nova", "sigma", "st-4", "st-5", "s21", "hex"]):
        category = "ot-lights"
        category_name = "OT Lights"
    elif any(k in comb for k in ["cautery", "electrosurg", "diathermy", "bipolar", "monopolar", "esu", "smoke evacuator", "turp", "vessel sealer", "coagulat", "smoke-vac", "uro bitur"]):
        category = "electrosurgical-units"
        category_name = "Electrosurgical Units"
    elif any(k in comb for k in ["cryo gun", "cryotherapy", "liquid nitrogen", "cryosurg", "cryo"]):
        category = "cryo-surgical"
        category_name = "Cryo Surgical"
    elif any(k in comb for k in ["ultrasound", "tens", "laser therapy", "shockwave", "traction", "cpm", "muscle stimulator", "rehabilitation", "ift", "combi"]):
        category = "physiotherapy"
        category_name = "Physiotherapy"
    elif any(k in comb for k in ["ot table", "examination table", "operating table", "surgery table", "wheelchair", "massage chair", "derma"]):
        category = "examination-ot-tables"
        category_name = "Examination & OT Tables"
    elif any(k in comb for k in ["gynecology", "obstetric", "gynaec", "fetal", "colposcope", "thermal ablation", "thermoglide"]):
        category = "obstetrics-and-gynaecology"
        category_name = "Obstetrics & Gynaecology"
    else:
        category = "medical-equipment"
        category_name = "Medical Equipment"

    return {
        "slug": slug,
        "referenceURL": url,
        "referenceProductName": title,
        "modelRibbon": ribbon,
        "sku": sku,
        "brand": brand,
        "category": category,
        "categoryName": category_name,
        "regularPriceINR": orig_inr,
        "salePriceINR": sale_inr,
        "regularPriceUSD": reg_usd,
        "salePriceUSD": sale_usd,
        "currency": "INR",
        "hasDiscount": has_discount,
        "sourceTimestamp": datetime.now(timezone.utc).isoformat(),
        "status": "SUCCESS" if (orig_inr is not None or sale_inr is not None) else "NO_PRICE"
    }

def run_audit(urls):
    print(f"Starting live catalogue audit for {len(urls)} URLs...")
    results = []
    completed = 0
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_url = {executor.submit(extract_product_audit, u): u for u in urls}
        for future in as_completed(future_to_url):
            completed += 1
            res = future.result()
            results.append(res)
            slug = res.get("slug", "")[:35]
            reg = res.get("regularPriceINR")
            sale = res.get("salePriceINR")
            print(f"[{completed}/{len(urls)}] Audited: {slug} | Reg: {reg} | Sale: {sale} | Ribbon: {res.get('modelRibbon')}")

    # Save reference catalogue audit
    with open(AUDIT_OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"Saved audit of {len(results)} items to {AUDIT_OUTPUT_FILE}")
    return results

def sync_prices():
    with open(CRAWLED_URLS_FILE, "r", encoding="utf-8") as f:
        urls = json.load(f)

    audit_results = run_audit(urls)
    audit_map = {item["slug"]: item for item in audit_results if item.get("status") == "SUCCESS"}

    # Load existing DR.MEDEX products from products.js or db.json
    with open(DB_JSON_FILE, "r", encoding="utf-8") as f:
        db_data = json.load(f)

    existing_products = db_data.get("products", [])
    print(f"Loaded {len(existing_products)} products from db.json")

    # Clean up duplicate copy products with None id
    valid_products = []
    duplicates_removed = 0
    seen_slugs = set()
    for p in existing_products:
        pid = p.get("id")
        pslug = p.get("slug")
        if not pid or "copy" in (p.get("title", "").lower()) or pslug in seen_slugs:
            duplicates_removed += 1
            continue
        seen_slugs.add(pslug)
        valid_products.append(p)

    print(f"Cleaned up {duplicates_removed} invalid/duplicate records. Remaining: {len(valid_products)}")

    # Synchronization metrics
    matched_count = 0
    updated_count = 0
    already_matching_count = 0
    needs_review_count = 0
    not_found_count = 0
    no_price_count = 0

    sync_changes = []

    for p in valid_products:
        pslug = p.get("slug", "")
        ptitle = p.get("title", "") or p.get("productName", "")

        # Try matching with audit_map
        matched_audit = audit_map.get(pslug)
        
        # Secondary matching if slug did not directly match
        if not matched_audit:
            # Match by title or ribbon
            for item in audit_results:
                it_title = item.get("referenceProductName", "").lower()
                it_ribbon = item.get("modelRibbon", "").lower()
                clean_ptitle = re.sub(r"\bDR\.MEDEX\b", "", ptitle, flags=re.I).strip().lower()
                if it_ribbon and len(it_ribbon) > 2 and it_ribbon in clean_ptitle:
                    matched_audit = item
                    break
                if it_title and len(it_title) > 5 and it_title in clean_ptitle:
                    matched_audit = item
                    break

        if not matched_audit:
            not_found_count += 1
            continue

        if matched_audit.get("status") == "NO_PRICE":
            no_price_count += 1
            p["priceStatus"] = "PRICE_NOT_AVAILABLE"
            continue

        matched_count += 1

        reg_inr = matched_audit.get("regularPriceINR")
        sale_inr = matched_audit.get("salePriceINR")
        reg_usd = matched_audit.get("regularPriceUSD")
        sale_usd = matched_audit.get("salePriceUSD")
        has_disc = matched_audit.get("hasDiscount", False)
        ribbon = matched_audit.get("modelRibbon", "")

        # Calculate discount percentage
        if reg_inr and sale_inr and reg_inr > sale_inr:
            discount_pct = round(((reg_inr - sale_inr) / reg_inr) * 100)
        else:
            discount_pct = 0

        # Selling price: DR.MEDEX active price in INR
        active_price = sale_inr if (has_disc and sale_inr) else reg_inr
        old_reg_price = p.get("regularPrice")
        old_sale_price = p.get("salePrice")
        old_base_price = p.get("basePrice")

        # Check if price changed
        price_changed = (old_base_price != active_price or old_reg_price != reg_inr)

        if price_changed:
            updated_count += 1
        else:
            already_matching_count += 1

        # Preserve / set modelNumber if ribbon exists
        if ribbon and (not p.get("modelNumber") or p.get("modelNumber").startswith("DRM-")):
            p["modelNumber"] = ribbon
            p["ribbon"] = ribbon

        # Store prices without rounding decimals
        p["basePrice"] = active_price
        p["regularPrice"] = reg_inr
        p["salePrice"] = sale_inr if has_disc else reg_inr
        p["discountPercentage"] = discount_pct
        p["baseCurrency"] = "INR"

        # Separate REFERENCE PRICING concept from DR.MEDEX active SELLING PRICE
        p["referencePricing"] = {
            "referenceSource": "SKRILIX Global Public Catalogue",
            "referenceProductName": matched_audit.get("referenceProductName"),
            "referenceModel": ribbon,
            "category": matched_audit.get("category"),
            "referenceURL": matched_audit.get("referenceURL"),
            "referenceRegularINR": reg_inr,
            "referenceSaleINR": sale_inr,
            "referenceRegularUSD": reg_usd,
            "referenceSaleUSD": sale_usd,
            "hasDiscount": has_disc,
            "discountPercentage": discount_pct,
            "lastSyncedAt": matched_audit.get("sourceTimestamp"),
            "syncStatus": "SYNCED"
        }

        # Keep lastPriceSync on product level for quick admin table display
        p["lastPriceSync"] = matched_audit.get("sourceTimestamp")
        p["priceSyncStatus"] = "SYNCED"

        sync_changes.append({
            "id": p.get("id"),
            "title": p.get("title"),
            "model": ribbon or p.get("modelNumber"),
            "oldBasePrice": old_base_price,
            "newBasePrice": active_price,
            "oldRegularPrice": old_reg_price,
            "newRegularPrice": reg_inr,
            "newSalePrice": sale_inr,
            "newRegularUSD": reg_usd,
            "newSaleUSD": sale_usd,
            "discountPercentage": discount_pct,
            "referenceURL": matched_audit.get("referenceURL")
        })

    # Save to db.json
    db_data["products"] = valid_products
    with open(DB_JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(db_data, f, indent=2)
    print(f"Updated {len(valid_products)} products in {DB_JSON_FILE}")

    # Also update products.js
    products_js_content = f"// Synchronized DR.MEDEX Product Database\n// Last Synced: {datetime.now(timezone.utc).isoformat()}\n\nconst products = {json.dumps(valid_products, indent=2)};\n\nmodule.exports = products;\n"
    with open(PRODUCTS_JS_FILE, "w", encoding="utf-8") as f:
        f.write(products_js_content)
    print(f"Updated {len(valid_products)} products in {PRODUCTS_JS_FILE}")

    # Generate sync report
    report = {
        "syncTimestamp": datetime.now(timezone.utc).isoformat(),
        "totalReferenceProductsDiscovered": len(urls),
        "matched": matched_count,
        "updated": updated_count,
        "alreadyMatching": already_matching_count,
        "needsReview": needs_review_count,
        "notFoundInDRMEDEX": not_found_count,
        "noPublicPrice": no_price_count,
        "duplicatesPrevented": duplicates_removed,
        "sampleChangedProducts": sync_changes[:20],
        "allChanges": sync_changes
    }

    with open(REPORT_OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("\n==========================================")
    print("PRICE SYNC COMPLETE REPORT:")
    print(f"Total reference products discovered: {len(urls)}")
    print(f"Matched: {matched_count}")
    print(f"Updated: {updated_count}")
    print(f"Already matching: {already_matching_count}")
    print(f"Needs review: {needs_review_count}")
    print(f"Not found in DR.MEDEX: {not_found_count}")
    print(f"No public price: {no_price_count}")
    print(f"Duplicates prevented: {duplicates_removed}")
    print(f"Report saved to: {REPORT_OUTPUT_FILE}")
    print("==========================================\n")

if __name__ == "__main__":
    sync_prices()
