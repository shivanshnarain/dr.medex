/**
 * DR.MEDEX Systematic Catalogue Hierarchy
 * Structured 3-Tier Classification:
 * 1. Primary Category (7 categories)
 * 2. Subcategory (dependent)
 * 3. Product / Equipment Type (dependent)
 *
 * Enriched with full discovery from reference medical equipment catalogue
 */

const catalogueHierarchy = {
  "ot-lights": {
    id: "ot-lights",
    name: "OT / Surgical Lights",
    code: "OTL",
    status: "ACTIVE",
    subcategories: [
      {
        id: "single-dome-ot-lights",
        name: "Single Dome OT Lights",
        equipmentTypes: [
          { id: "ceiling-single-led", name: "Ceiling-Mounted Single Dome LED OT Light", defaultCode: "CSD" },
          { id: "hex-single-led", name: "Hexagonal Single Dome Surgical Light", defaultCode: "HSD" },
          { id: "star-84-single", name: "Star 84 Single Dome Surgical Light", defaultCode: "S84" },
          { id: "48-led-minor-ot", name: "48 LED Single Dome Minor OT Light", defaultCode: "M48" },
          { id: "wall-mounted-single", name: "Wall-Mounted Single Dome LED Light", defaultCode: "WSD" }
        ]
      },
      {
        id: "ot-surgical-lights-double-dome",
        name: "Double Dome OT Lights",
        equipmentTypes: [
          { id: "ceiling-double-led", name: "Ceiling-Mounted Double Dome LED OT Light", defaultCode: "CDD" },
          { id: "48-48-double-dome", name: "48+48 LED Double Dome Surgical Light", defaultCode: "D48" },
          { id: "90-90-double-dome", name: "90+90 LED Operating Theatre Light", defaultCode: "D90" },
          { id: "double-dome-camera", name: "Double Dome with Integrated HD Camera", defaultCode: "DDC" },
          { id: "dual-shadowless-system", name: "Dual Head Shadowless Surgical System", defaultCode: "DSS" }
        ]
      },
      {
        id: "mobile-led-ot-lights",
        name: "Mobile OT Lights",
        equipmentTypes: [
          { id: "mobile-battery-ot", name: "Mobile LED OT Light with Battery Backup", defaultCode: "MBB" },
          { id: "84-led-mobile", name: "84 LED Mobile Surgical Examination Light", defaultCode: "M84" },
          { id: "portable-emergency-floor", name: "Portable Emergency Floor Operating Light", defaultCode: "PEF" },
          { id: "mobile-standby-minor", name: "Mobile Standby Minor Surgery Light", defaultCode: "MSM" }
        ]
      }
    ]
  },

  "electrosurgical-units": {
    id: "electrosurgical-units",
    name: "Electrosurgical Units",
    code: "ESU",
    status: "ACTIVE",
    subcategories: [
      {
        id: "electro-surgical-skin-cautery",
        name: "Electrosurgical Cautery",
        equipmentTypes: [
          { id: "rf-cautery-3-5mhz", name: "RF Radiofrequency Cautery Unit (3.5 MHz)", defaultCode: "RFC" },
          { id: "digital-cautery-mono-bi", name: "Digital Monopolar & Bipolar Cautery", defaultCode: "DMC" },
          { id: "battery-pen-cautery", name: "Battery-Operated Portable Pen Cautery", defaultCode: "BPC" },
          { id: "dermatology-micro-cautery", name: "Dermatology / Ophthalmology Micro Cautery", defaultCode: "DMC" },
          { id: "wet-field-bipolar-coagulator", name: "Wet-Field Bipolar Coagulator (Ophthalmic & ENT)", defaultCode: "WBC" }
        ]
      },
      {
        id: "electrosurgical-generator",
        name: "Electrosurgical Generators",
        equipmentTypes: [
          { id: "esu-generator-300w", name: "High-Frequency Electrosurgical Generator 300W", defaultCode: "G30" },
          { id: "esu-generator-400w-turp", name: "Advanced Laparoscopic & TURP Generator 400W", defaultCode: "G40" },
          { id: "vessel-sealing-system", name: "Vessel Sealing Electrosurgical System", defaultCode: "VSS" },
          { id: "microprocessor-diathermy", name: "Microprocessor Diathermy Generator", defaultCode: "MDG" }
        ]
      },
      {
        id: "surgical-accessories",
        name: "Surgical Electrodes & Accessories",
        equipmentTypes: [
          { id: "monopolar-handpiece", name: "Reusable Monopolar Surgical Handpiece", defaultCode: "RMH" },
          { id: "patient-return-plate", name: "Silicone Patient Return Plate", defaultCode: "PRP" },
          { id: "bipolar-forceps-cable", name: "Bipolar Coagulation Forceps & Cable", defaultCode: "BFC" },
          { id: "footswitch-controller", name: "Foot Switch Controller Assembly", defaultCode: "FSC" }
        ]
      },
      {
        id: "smoke-evacuation-systems",
        name: "Surgical Smoke Evacuators",
        equipmentTypes: [
          { id: "portable-smoke-evacuator-hepa", name: "Portable Surgical Smoke Evacuator with HEPA Filtration", defaultCode: "PSE" },
          { id: "high-suction-smoke-evacuator", name: "High-Suction ULPA Surgical Smoke Evacuation System", defaultCode: "SSE" }
        ]
      }
    ]
  },

  "cryo-surgical": {
    id: "cryo-surgical",
    name: "Cryosurgical Equipment",
    code: "CRY",
    status: "ACTIVE",
    subcategories: [
      {
        id: "cryo-gun",
        name: "Cryo Surgical Guns",
        equipmentTypes: [
          { id: "liquid-nitrogen-gun-300ml", name: "Precision Liquid Nitrogen Mini Cryo Gun (300 ml)", defaultCode: "C30" },
          { id: "liquid-nitrogen-gun-350ml", name: "Liquid Nitrogen Mini Cryo Gun (350 ml)", defaultCode: "C35" },
          { id: "liquid-nitrogen-gun-500ml", name: "Liquid Nitrogen Cryo Gun (500 ml)", defaultCode: "C50" },
          { id: "dermatology-cryo-sprayer", name: "Dermatology Precision Cryo Sprayer", defaultCode: "DPS" },
          { id: "multi-tip-cryo-unit", name: "Multi-Tip Cryosurgical Unit", defaultCode: "MTC" }
        ]
      },
      {
        id: "cryotherapy-systems",
        name: "Cryotherapy Systems",
        equipmentTypes: [
          { id: "clinical-cryo-system", name: "Clinical Cryotherapy System", defaultCode: "CCS" },
          { id: "gynaecology-cryo-cautery", name: "Gynecological Cryo Cautery System", defaultCode: "GCC" },
          { id: "cryo-decongestive-unit", name: "Cryo Decongestive Chamber Unit", defaultCode: "CDU" },
          { id: "cordless-cervical-thermal-ablation", name: "Cordless Cervical Thermal Ablation Thermocoagulator", defaultCode: "CTA" }
        ]
      },
      {
        id: "cryo-replacement-nozzles",
        name: "Replacement Nozzles & Accessories",
        equipmentTypes: [
          { id: "curved-nozzle-set", name: "Curved Aperture Spray Nozzles Set", defaultCode: "CNS" },
          { id: "contact-cryo-probes", name: "Contact Cryo Probes (Flat & Conical)", defaultCode: "CCP" },
          { id: "cryogenic-gloves", name: "Cryogenic Protective Thermal Gloves", defaultCode: "CPG" },
          { id: "ln2-extraction-syphon", name: "Liquid Nitrogen Extraction Syphon", defaultCode: "LES" }
        ]
      }
    ]
  },

  "examination-ot-tables": {
    id: "examination-ot-tables",
    name: "Examination & OT Tables",
    code: "TAB",
    status: "ACTIVE",
    subcategories: [
      {
        id: "operating-tables",
        name: "Operating Tables",
        equipmentTypes: [
          { id: "electric-ot-table", name: "Electric Multi-Position Operating Table", defaultCode: "EOT" },
          { id: "electro-hydraulic-ot", name: "Electro-Hydraulic Surgical Theatre Table", defaultCode: "EHT" },
          { id: "c-arm-ot-table", name: "C-Arm Compatible Fluoroscopy OT Table", defaultCode: "CFT" },
          { id: "manual-hydraulic-ot", name: "General Manual Hydraulic Surgery Table", defaultCode: "MHT" }
        ]
      },
      {
        id: "examination-tables",
        name: "Examination Tables",
        equipmentTypes: [
          { id: "clinical-exam-bed", name: "Electric Clinical Examination Bed", defaultCode: "CEB" },
          { id: "hydraulic-treatment-couch", name: "2-Section Hydraulic Treatment Couch", defaultCode: "HTC" },
          { id: "hi-low-exam-couch", name: "Hi-Low Examination Couch with Paper Roll", defaultCode: "HLE" },
          { id: "multi-section-exam-table", name: "Multi-Section Clinical Examination Table", defaultCode: "MET" }
        ]
      },
      {
        id: "treatment-tables",
        name: "Treatment & Rehabilitation Couches",
        equipmentTypes: [
          { id: "dermatology-chair", name: "Adjustable Dermatology & Cosmetology Chair", defaultCode: "ADC" },
          { id: "rehab-massage-bed", name: "Rehabilitation & Massage Treatment Bed", defaultCode: "RMB" },
          { id: "diagnostic-tilt-table", name: "Tilt-Table for Physical Diagnostics", defaultCode: "TTD" },
          { id: "rotating-electric-spa-bed", name: "Rotating Electric Facial & Spa Treatment Bed", defaultCode: "RFB" },
          { id: "zero-gravity-therapy-chair", name: "Electric 4D Zero Gravity Physical Therapy Chair", defaultCode: "ZGC" }
        ]
      }
    ]
  },

  "obstetrics-and-gynaecology": {
    id: "obstetrics-and-gynaecology",
    name: "Obstetrics & Gynaecology",
    code: "OBG",
    status: "ACTIVE",
    subcategories: [
      {
        id: "obstetric-tables",
        name: "Obstetric Delivery Tables",
        equipmentTypes: [
          { id: "electric-delivery-bed", name: "Multi-Function Electric Obstetric Delivery Bed", defaultCode: "EDB" },
          { id: "telescopic-ldr-table", name: "Telescopic LDR Labor Delivery Table", defaultCode: "TLD" },
          { id: "hydraulic-delivery-couch", name: "Hydraulic Maternal Delivery Couch", defaultCode: "HDC" }
        ]
      },
      {
        id: "gynaecology-examination-tables",
        name: "Gynaecology Examination Tables",
        equipmentTypes: [
          { id: "electric-gynae-chair", name: "Electric Gynecological Examination Chair", defaultCode: "EGC" },
          { id: "hydraulic-lithotomy-table", name: "Hydraulic Gynae Lithotomy Examination Table", defaultCode: "HLT" },
          { id: "manual-gynae-bed", name: "Manual 3-Section Gynaecological Bed", defaultCode: "MGB" }
        ]
      },
      {
        id: "fetal-monitoring-equipment",
        name: "Fetal Doppler & Monitoring",
        equipmentTypes: [
          { id: "video-colposcope", name: "Digital Video Colposcope with Monitor", defaultCode: "DVC" },
          { id: "cervical-thermal-ablation", name: "Cervical Thermal Ablation Coagulator", defaultCode: "CTA" },
          { id: "fetal-heart-doppler", name: "Ultrasonic Fetal Heart Rate Doppler", defaultCode: "FHD" },
          { id: "fetal-ctg-monitor", name: "Dual Fetal Maternal CTG Monitor", defaultCode: "FCM" }
        ]
      }
    ]
  },

  "medical-equipment": {
    id: "medical-equipment",
    name: "General Medical Equipment",
    code: "MED",
    status: "ACTIVE",
    subcategories: [
      {
        id: "diagnostic-equipment",
        name: "Diagnostic Instruments",
        equipmentTypes: [
          { id: "diagnostic-station", name: "Digital Diagnostic Station", defaultCode: "DDS" },
          { id: "vitrectomy-system", name: "Ophthalmic Anterior Vitrectomy System", defaultCode: "AVS" },
          { id: "needleless-jet-injector", name: "High-Pressure Needleless Jet Injector", defaultCode: "NJI" },
          { id: "vital-signs-monitor", name: "Digital Vital Signs Patient Monitor", defaultCode: "VSM" },
          { id: "infrared-vein-finder-glasses", name: "Hands-Free Infrared Vein Finder Glasses", defaultCode: "VFG" },
          { id: "handheld-vein-illuminator", name: "Handheld Vascular Infrared Vein Illuminator", defaultCode: "HVI" }
        ]
      },
      {
        id: "surgical-headlights",
        name: "Surgical Headlights",
        equipmentTypes: [
          { id: "wireless-led-headlight", name: "Wireless LED Surgical Headlight", defaultCode: "WLH" },
          { id: "fiberoptic-headlight", name: "High-Lumen Fiberoptic Headlight with Illuminator", defaultCode: "FLH" },
          { id: "loupe-mounted-light", name: "Loupe-Mounted Surgical Examination Light", defaultCode: "LML" }
        ]
      },
      {
        id: "medical-trolleys",
        name: "Medical Equipment Trolleys",
        equipmentTypes: [
          { id: "multi-tier-trolley", name: "Heavy-Duty Multi-Tier Medical Equipment Trolley", defaultCode: "MET" },
          { id: "instrument-trolley", name: "Operating Theatre Instrument Trolley", defaultCode: "OIT" },
          { id: "emergency-crash-cart", name: "Emergency Crash Cart & Utility Trolley", defaultCode: "ECC" }
        ]
      },
      {
        id: "laparoscopic-insufflation",
        name: "Laparoscopic Insufflators",
        equipmentTypes: [
          { id: "co2-insufflator-30l", name: "Laparoscopic CO₂ Insufflator 30L with Gas Heating", defaultCode: "INF" },
          { id: "co2-insufflator-40l", name: "High-Flow Laparoscopic CO₂ Insufflator 40L", defaultCode: "HF4" }
        ]
      },
      {
        id: "surgical-instruments-biopsy",
        name: "Biopsy & Minor Surgery Instruments",
        equipmentTypes: [
          { id: "sterile-biopsy-punch", name: "Sterile Disposable Dermal Biopsy Punch Set", defaultCode: "DBP" },
          { id: "precision-biopsy-forceps", name: "Precision Endoscopic & Dermal Biopsy Forceps", defaultCode: "PBF" }
        ]
      }
    ]
  },

  "physiotherapy": {
    id: "physiotherapy",
    name: "Physiotherapy Machines",
    code: "PHY",
    status: "INACTIVE",
    subcategories: [
      {
        id: "ultrasound-therapy-machines",
        name: "Ultrasound Therapy Machines",
        equipmentTypes: [
          { id: "ultrasound-1mhz", name: "1 MHz Therapeutic Ultrasound Machine", defaultCode: "U01" },
          { id: "ultrasound-1-3mhz", name: "1 & 3 MHz Dual Frequency Ultrasound Therapy", defaultCode: "U13" },
          { id: "ultrasound-portable", name: "Portable Compact Ultrasound Unit", defaultCode: "PCU" },
          { id: "ultrasound-wand-probe", name: "1 & 3 MHz Ultrasound Transducer Wand Probe", defaultCode: "UWP" }
        ]
      },
      {
        id: "tens-machines",
        name: "TENS Machines",
        equipmentTypes: [
          { id: "tens-2-channel", name: "2-Channel Digital TENS Unit", defaultCode: "T02" },
          { id: "tens-4-channel", name: "4-Channel Multi-Waveform TENS System", defaultCode: "T04" },
          { id: "combo-tens-ems", name: "Combo TENS with EMS Stimulator", defaultCode: "CTE" }
        ]
      },
      {
        id: "laser-therapy-machine",
        name: "Laser Therapy Machines",
        equipmentTypes: [
          { id: "laser-class-3b", name: "Class 3B Clinical Cold Laser Therapy", defaultCode: "L3B" },
          { id: "laser-dual-diode", name: "Dual Diode High-Intensity Laser Unit", defaultCode: "DIL" },
          { id: "lllt-probe-cluster", name: "Low-Level Laser Therapy (LLLT) Cluster Probe", defaultCode: "LCP" }
        ]
      },
      {
        id: "cpm",
        name: "Continuous Passive Motion (CPM)",
        equipmentTypes: [
          { id: "cpm-lower-limb", name: "Lower Limb Knee & Hip CPM Machine", defaultCode: "LLC" },
          { id: "cpm-upper-limb", name: "Upper Limb Shoulder CPM Device", defaultCode: "ULC" },
          { id: "cpm-ankle-exerciser", name: "Continuous Passive Motion Ankle Joint Exerciser", defaultCode: "AJE" }
        ]
      },
      {
        id: "shortwave-diathermy-machine",
        name: "Shortwave Diathermy Machine",
        equipmentTypes: [
          { id: "swd-continuous-300w", name: "300W Continuous Shortwave Diathermy", defaultCode: "S30" },
          { id: "swd-pulsed-500w", name: "500W Pulsed & Continuous Diathermy", defaultCode: "S50" }
        ]
      },
      {
        id: "longwave-diathermy-machine",
        name: "Longwave Diathermy Machine",
        equipmentTypes: [
          { id: "lwd-rf-deep-heat", name: "Longwave RF Deep Heat Therapy Unit", defaultCode: "LRF" }
        ]
      },
      {
        id: "shockwave-therapy-machine",
        name: "Shockwave Therapy Machine",
        equipmentTypes: [
          { id: "eswt-radial", name: "Radial Extracorporeal Shockwave Therapy (ESWT)", defaultCode: "RST" },
          { id: "eswt-ballistic", name: "Ballistic Shockwave Pain Therapy System", defaultCode: "BST" }
        ]
      },
      {
        id: "electronic-traction-machine",
        name: "Electronic Traction Machine",
        equipmentTypes: [
          { id: "traction-cervical-lumbar", name: "Microprocessor Cervical & Lumbar Traction", defaultCode: "CLT" },
          { id: "traction-bed-assembly", name: "Static & Intermittent Traction Bed", defaultCode: "SIT" }
        ]
      },
      {
        id: "electric-muscle-stimulator",
        name: "Electric Muscle Stimulator",
        equipmentTypes: [
          { id: "muscle-stimulator-galvanic", name: "Diagnostic Muscle Stimulator with Galvanic/Faradic", defaultCode: "MGF" },
          { id: "muscle-stimulator-nmse", name: "Digital Neuromuscular Stimulation Unit", defaultCode: "NMS" },
          { id: "russian-current-stimulator", name: "Clinical Russian Current Muscle Stimulator", defaultCode: "RMS" }
        ]
      },
      {
        id: "combination-therapy-machines",
        name: "Combination Electrotherapy Systems",
        equipmentTypes: [
          { id: "combo-ift-us-tens-ems", name: "4-in-1 Combination Therapy (IFT/Ultrasound/TENS/EMS)", defaultCode: "CMB" },
          { id: "interferential-ift-unit", name: "Dual-Channel Clinical Interferential Therapy (IFT) Unit", defaultCode: "IFT" }
        ]
      }
    ]
  }
};

module.exports = catalogueHierarchy;
