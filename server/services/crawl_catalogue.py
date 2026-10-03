import urllib.request
import re
import json
import xml.etree.ElementTree as ET
import os

headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

def fetch(url):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as res:
        return res.read().decode("utf-8", errors="ignore")

def main():
    print("Fetching sitemaps...")
    sitemap_urls = []
    try:
        sitemap_xml = fetch("https://www.skrilixglobal.com/sitemap.xml")
        root = ET.fromstring(sitemap_xml)
        for elem in root.iter():
            if elem.tag.endswith("loc") and elem.text:
                sitemap_urls.append(elem.text.strip())
        print(f"Found {len(sitemap_urls)} entries in main sitemap.xml")
    except Exception as e:
        print(f"Error fetching main sitemap: {e}")

    product_urls = set()
    category_urls = set()

    for u in sitemap_urls:
        if "sitemap" in u:
            try:
                sub_xml = fetch(u)
                sub_root = ET.fromstring(sub_xml)
                for elem in sub_root.iter():
                    if elem.tag.endswith("loc") and elem.text:
                        loc = elem.text.strip()
                        if "/product-page/" in loc:
                            product_urls.add(loc)
                        elif any(c in loc for c in ["light", "therapy", "surgical", "table", "tens", "chair", "cpm", "gun", "massage"]):
                            category_urls.add(loc)
            except Exception as e:
                print(f"Error fetching sub-sitemap {u}: {e}")
        elif "/product-page/" in u:
            product_urls.add(u)
        else:
            category_urls.add(u)

    print(f"Total product URLs from sitemaps: {len(product_urls)}")
    print(f"Total category URLs from sitemaps: {len(category_urls)}")

    # Crawl categories to discover any additional product links
    cat_to_crawl = [
        "https://www.skrilixglobal.com/shop-all",
        "https://www.skrilixglobal.com/ultrasound-therapy-machines",
        "https://www.skrilixglobal.com/tens-machines",
        "https://www.skrilixglobal.com/laser-therapy-machine",
        "https://www.skrilixglobal.com/cpm",
        "https://www.skrilixglobal.com/shortwave-diathermy-machine",
        "https://www.skrilixglobal.com/longwave-diathermy-machine",
        "https://www.skrilixglobal.com/shockwave-therapy-machine",
        "https://www.skrilixglobal.com/electronic-traction-machine",
        "https://www.skrilixglobal.com/electric-muscle-stimulator",
        "https://www.skrilixglobal.com/electro-surgical-units",
        "https://www.skrilixglobal.com/electro-surgical-skin-cautery",
        "https://www.skrilixglobal.com/electrosurgical-generator",
        "https://www.skrilixglobal.com/cryo-gun",
        "https://www.skrilixglobal.com/ot-light-ot-lamps",
        "https://www.skrilixglobal.com/single-dome-ot-lights",
        "https://www.skrilixglobal.com/ot-surgical-lights-double-dome",
        "https://www.skrilixglobal.com/mobile-led-ot-lights",
        "https://www.skrilixglobal.com/examination-ot-tables",
        "https://www.skrilixglobal.com/obstetrics-and-gynaecology",
        "https://www.skrilixglobal.com/massage-chair-s"
    ]

    for cat_url in cat_to_crawl:
        try:
            html = fetch(cat_url)
            # Find product-page links
            matches = re.findall(r'href=[\'"]([^\'"]*product-page[^\'"]*)[\'"]', html)
            for m in matches:
                clean_url = m.split("?")[0].strip()
                if not clean_url.startswith("http"):
                    clean_url = "https://www.skrilixglobal.com" + clean_url
                product_urls.add(clean_url)
        except Exception as e:
            print(f"Error crawling {cat_url}: {e}")

    print(f"\nFinal count of discovered product URLs: {len(product_urls)}")
    
    # Save list of products to a JSON file
    out_file = "/Users/shivanshnarain/medicuroglobal/server/data/crawled_urls.json"
    with open(out_file, "w") as f:
        json.dump(list(sorted(product_urls)), f, indent=2)
    print(f"Saved discovered URLs to {out_file}")

    for idx, p in enumerate(sorted(product_urls), 1):
        print(f"[{idx}] {p}")

if __name__ == "__main__":
    main()
