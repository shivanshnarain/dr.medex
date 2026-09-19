const products = [
  // 1. PHYSIOTHERAPY MACHINES
  {
    id: "prod-phy-01",
    slug: "ultrasound-therapy-machine-pro-1000",
    title: "MediCuro UltraSound Pro 1000 | Dual Frequency (1 & 3 MHz) Clinical Physiotherapy System",
    sku: "MC-PHY-US1000",
    brand: "MediCuro Global",
    category: "physiotherapy",
    subcategory: "ultrasound-therapy-machines",
    basePrice: 1450.00,
    originalPrice: 1750.00,
    stock: 24,
    rating: 4.9,
    reviewCount: 38,
    isFeatured: true,
    isBestSeller: true,
    images: [
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1000&q=80"
    ],
    shortDescription: "Clinical dual-frequency ultrasound therapy system with 1 MHz deep tissue penetration and 3 MHz superficial treatment capabilities. Microprocessor-controlled with continuous and pulsed output modes.",
    overview: "The MediCuro UltraSound Pro 1000 is an advanced medical ultrasound therapy unit designed for physical therapy clinics, sports rehabilitation centers, and orthopedic hospitals. Equipped with a waterproof multi-frequency transducer and digital contact detection, it delivers precise acoustic energy directly to targeted musculoskeletal tissue.",
    features: [
      "Dual frequency operation (1 MHz and 3 MHz)",
      "Continuous and pulsed output modes (10%, 20%, 50%, 100%)",
      "Ergonomic waterproof soundhead with visual contact indicator",
      "7-inch high-resolution medical touch display with treatment protocol presets",
      "Microprocessor feedback control ensuring uniform acoustic energy output",
      "Overheat auto-shutoff safety mechanism",
      "Rugged clinical chassis designed for 24/7 rehabilitation ward use"
    ],
    specifications: {
      "Operating Frequency": "1 MHz and 3 MHz ± 5%",
      "Maximum Intensity": "3.0 W/cm² (Pulsed), 2.0 W/cm² (Continuous)",
      "Effective Radiating Area (ERA)": "5.0 cm² ± 10%",
      "Beam Non-Uniformity Ratio (BNR)": "≤ 5:1 maximum",
      "Pulse Frequency": "100 Hz",
      "Treatment Timer": "0 to 30 minutes (Adjustable in 1 min increments)",
      "Display": "7.0-inch Color TFT Touchscreen",
      "Power Supply": "100–240V AC, 50/60 Hz, 85 VA",
      "Dimensions (W x D x H)": "310 x 260 x 120 mm",
      "Weight": "3.8 kg",
      "Water Resistance": "IPX7 (Applicator Probe only)"
    },
    applications: [
      "Deep tissue musculoskeletal inflammation relief",
      "Tendonitis, bursitis, and joint contractures",
      "Post-surgical scar tissue remodeling",
      "Sports injury rehabilitation and acute muscle spasm therapy"
    ],
    packageContents: [
      "UltraSound Pro 1000 Main Control Unit",
      "Multi-frequency Waterproof 5 cm² Transducer Soundhead",
      "Medical Grade Power Cable (Regional plug compliant)",
      "Hospital Grade Ultrasound Gel (250 ml starter bottle)",
      "Transducer Holder Cradle",
      "User Operation Manual & Calibration Certificate"
    ],
    powerRequirements: "AC 100–240V, 50/60 Hz universal input",
    certifications: ["ISO 13485:2016", "CE Medical Device Directive", "IEC 60601-1-2 EMC compliant"],
    warranty: "3 Years Comprehensive OEM Warranty & Spare Parts Support",
    shippingLeadTime: "3–5 Business Days (Air Express Freight)"
  },
  {
    id: "prod-phy-02",
    slug: "tens-muscle-stimulator-4-channel",
    title: "MediCuro NeuroStim Pro 4-Channel | Clinical TENS & Electrical Muscle Stimulator",
    sku: "MC-PHY-TENS4C",
    brand: "MediCuro Global",
    category: "physiotherapy",
    subcategory: "tens-machines",
    basePrice: 890.00,
    originalPrice: 1100.00,
    stock: 45,
    rating: 4.8,
    reviewCount: 52,
    isFeatured: true,
    isBestSeller: true,
    images: [
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=80"
    ],
    shortDescription: "4-Channel independent electrotherapy system combining TENS, EMS, Russian, and Interferential Current (IFC) waveforms for acute pain relief and neuromuscular re-education.",
    overview: "The NeuroStim Pro 4-Channel delivers clinical-grade electrotherapy across four completely independent channels, allowing simultaneous treatment of multiple anatomical sites or dual patients. Engineered for physiotherapy departments, pain management centers, and athletic rehabilitation clinics.",
    features: [
      "4 fully independent channels with dedicated intensity rotary dials",
      "Pre-programmed clinical library with 60+ anatomical protocols",
      "Multiple waveform modes: TENS, EMS, Russian, Pre-modulated IFC",
      "Constant current / constant voltage intelligent auto-switching",
      "Dual patient treatment capability with independent timers"
    ],
    specifications: {
      "Output Channels": "4 Independent galvanically isolated channels",
      "Waveforms": "Asymmetrical Biphasic, Symmetrical Biphasic, Russian (2.5 kHz), IFC",
      "Pulse Amplitude": "0–100 mA (500 ohm load)",
      "Pulse Width": "50–400 μs adjustable",
      "Pulse Rate": "1–150 Hz adjustable",
      "Timer": "1–60 min auto shutoff with audio alert",
      "Power": "AC 110–240V, 50/60 Hz and built-in lithium backup",
      "Weight": "2.9 kg"
    },
    applications: [
      "Chronic intractable pain management",
      "Post-traumatic and post-surgical pain reduction",
      "Muscle atrophy prevention and muscle strengthening",
      "Peripheral nerve injury recovery"
    ],
    packageContents: [
      "NeuroStim Pro 4-Channel Unit",
      "4x Color-coded Electrode Lead Wires",
      "16x Medical Reusable Self-Adhesive Electrodes",
      "Power Supply and Regional Adapter",
      "User Manual & Clinical Protocol Guide"
    ],
    powerRequirements: "100–240V AC, 50/60 Hz",
    certifications: ["ISO 13485:2016", "CE Marked", "IEC 60601-2-10"],
    warranty: "2 Years OEM Warranty",
    shippingLeadTime: "2–4 Business Days"
  },
  {
    id: "prod-phy-03",
    slug: "laser-therapy-system-class-4",
    title: "MediCuro OptiLaser 15W | High-Intensity Class 4 Deep Tissue Laser Therapy System",
    sku: "MC-PHY-LAS15W",
    brand: "MediCuro Global",
    category: "physiotherapy",
    subcategory: "laser-therapy-machine",
    basePrice: 3850.00,
    originalPrice: 4600.00,
    stock: 12,
    rating: 5.0,
    reviewCount: 19,
    isFeatured: true,
    isBestSeller: false,
    images: [
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1000&q=80"
    ],
    shortDescription: "High-power multi-wavelength (810nm, 980nm, 1064nm) Class 4 laser therapy system providing accelerated biostimulation and deep cellular photobiomodulation.",
    overview: "The OptiLaser 15W delivers penetrating photobiomodulation therapy to relieve deep inflammatory conditions, accelerate ligamentous repair, and dramatically reduce joint stiffness. Designed for elite athletic facilities and advanced orthopedic pain centers.",
    features: [
      "Triple wavelength delivery: 810 nm, 980 nm, 1064 nm synchronised",
      "Maximum continuous output power up to 15 Watts",
      "Intelligent touch interface with skin tone and tissue depth calibration",
      "Interchangeable clinical handpiece optical lenses (focus, zoom, massage ball)",
      "Certified emergency stop switch and safety interlock door port"
    ],
    specifications: {
      "Laser Classification": "Class IV (Class 4)",
      "Wavelengths": "810 nm, 980 nm, 1064 nm",
      "Peak Optical Power": "15 Watts (Continuous & Pulsed)",
      "Pulse Frequency": "1 Hz – 20,000 Hz",
      "Aiming Beam": "650 nm Red Diode, < 5 mW",
      "Cooling System": "Internal thermoelectric Peltier & silent forced air",
      "Display": "10.1-inch Capacitive Medical Touch Panel",
      "Weight": "7.5 kg"
    },
    applications: [
      "Cervical and lumbar disc herniation therapy",
      "Osteoarthritis of knee and hip joints",
      "Achilles tendinopathy and plantar fasciitis",
      "Carpal tunnel syndrome and neuropathic pain"
    ],
    packageContents: [
      "OptiLaser 15W Base Unit",
      "Fiber-optic Surgical Handpiece with 3 Optical Tips",
      "2x Certified Laser Safety Goggles (OD 6+)",
      "Patient Protective Eye Shields",
      "Heavy-duty Foot Switch with Protective Hood",
      "Laser Key & Interlock Plug"
    ],
    powerRequirements: "110–240V AC, 50/60 Hz, 250W",
    certifications: ["ISO 13485", "CE 0123", "IEC 60825-1 Laser Safety"],
    warranty: "3 Years Comprehensive Warranty on Laser Engine",
    shippingLeadTime: "3–6 Business Days"
  },
  {
    id: "prod-phy-04",
    slug: "cpm-knee-rehabilitation-machine",
    title: "MediCuro MobilKnee Pro | Motorized Continuous Passive Motion (CPM) System",
    sku: "MC-PHY-CPM200",
    brand: "MediCuro Global",
    category: "physiotherapy",
    subcategory: "cpm",
    basePrice: 1950.00,
    originalPrice: 2350.00,
    stock: 18,
    rating: 4.8,
    reviewCount: 27,
    isFeatured: false,
    isBestSeller: true,
    images: [
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=80"
    ],
    shortDescription: "Anatomically correct Continuous Passive Motion device for post-operative knee and hip joint rehabilitation. Range of motion from -10° hyperextension to 120° flexion.",
    overview: "MobilKnee Pro provides controlled continuous passive movement to restore joint mobility following Total Knee Arthroplasty (TKA), ACL reconstructions, and articular cartilage repair. Features gentle start/stop ramp transitions and an intuitive handheld patient safety controller.",
    features: [
      "Anatomical axis tracking ensures precise physiological alignment",
      "Adjustable range: -10° to 120° flexion",
      "Warm-up progressive mode automatically increases ROM gradually",
      "Patient handheld remote with emergency pause button",
      "Heavy-duty aluminum alloy chassis with washable antimicrobial padding"
    ],
    specifications: {
      "Range of Motion (Flexion/Extension)": "-10° to 120°",
      "Speed Range": "45°/min to 150°/min (5 levels)",
      "Patient Height Compatibility": "140 cm to 200 cm (Adult & Pediatric)",
      "Max Patient Limb Weight": "30 kg",
      "Chassis Material": "Extruded Aircraft Grade Anodized Aluminum",
      "Weight": "12.4 kg"
    },
    applications: [
      "Total Knee Replacement (TKR/TKA) recovery",
      "Cruciate ligament reconstruction (ACL/PCL)",
      "Patellar fractures and stable osteosynthesis",
      "Synovectomy and manipulation under anesthesia"
    ],
    packageContents: [
      "MobilKnee Pro CPM Frame",
      "Digital Hand Controller with Backlit LCD",
      "Soft Foam Patient Limb Support Kit (Autoclavable)",
      "Transport Carry Case with Wheels",
      "Power Supply and Emergency Stop Cord"
    ],
    powerRequirements: "100–240V AC, 50/60 Hz, 50W",
    certifications: ["ISO 13485:2016", "CE Medical Device", "IEC 60601-1"],
    warranty: "2 Years OEM Warranty",
    shippingLeadTime: "3–5 Business Days"
  },
  {
    id: "prod-phy-05",
    slug: "shockwave-therapy-machine-radial",
    title: "MediCuro RadialPulse 300 | Extracorporeal Radial Shockwave Therapy (ESWT) System",
    sku: "MC-PHY-ESWT300",
    brand: "MediCuro Global",
    category: "physiotherapy",
    subcategory: "shockwave-therapy-machine",
    basePrice: 4200.00,
    originalPrice: 5100.00,
    stock: 15,
    rating: 4.9,
    reviewCount: 31,
    isFeatured: true,
    isBestSeller: true,
    images: [
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1000&q=80"
    ],
    shortDescription: "Ballistic pneumatic radial shockwave therapy system delivering up to 5.0 Bar pressure and 21 Hz frequency. Treats chronic tendinopathies, calcifications, and myofascial trigger points.",
    overview: "The RadialPulse 300 generates high-energy acoustic pulses using an electromagnetic ballistic applicator. It triggers angiogenesis, breaks down calcifications, and stimulates cellular self-repair mechanisms in stubborn chronic soft-tissue pathologies.",
    features: [
      "Adjustable energy pressure: 1.0 to 5.0 Bar in 0.1 Bar increments",
      "Frequency range: 1 to 21 Hz with burst and ramp modes",
      "High-durability projectile mechanism rated for > 3,000,000 pulses",
      "5 Interchangeable applicator transmitter heads (Radial, Focus, Deep, Trigger, Fascia)",
      "Silent oil-free medical compressor built into the chassis"
    ],
    specifications: {
      "Technology": "Compressor-free Electromagnetic Ballistic Acoustic Wave",
      "Energy Levels": "1.0 – 5.0 Bar (approx. 60 – 185 mJ)",
      "Frequency": "1 – 21 Hz",
      "Applicator Heads": "6mm, 15mm, 20mm, 25mm, 35mm Titanium Transmitters",
      "Bullet Life Cycle": "≥ 3,000,000 Shocks before replacement",
      "User Interface": "10-inch Full Color Touchscreen with Anatomical Illustrated Guide",
      "Weight": "16.8 kg"
    },
    applications: [
      "Plantar fasciitis with or without heel spur",
      "Calcific tendinitis of the shoulder rotator cuff",
      "Lateral & medial epicondylitis (Tennis & Golfer's elbow)",
      "Patellar tendinopathy (Jumper's knee)",
      "Greater trochanteric pain syndrome"
    ],
    packageContents: [
      "RadialPulse 300 Console with Integrated Compressor",
      "Ergonomic Shockwave Handpiece",
      "5x Titanium Acoustic Transmitters in Aluminum Case",
      "Handpiece Silicone Protective Caps (Pack of 10)",
      "Medical Contact Gel (500 ml)",
      "Heavy-duty Foot Switch and Power Cord"
    ],
    powerRequirements: "110–240V AC, 50/60 Hz, 300 VA",
    certifications: ["ISO 13485:2016", "CE 0482", "IEC 60601-1"],
    warranty: "3 Years Console & 1 Year Handpiece Warranty",
    shippingLeadTime: "4–6 Business Days"
  },

  // 2. ELECTROSURGICAL UNITS
  {
    id: "prod-esu-01",
    slug: "electrosurgical-generator-400w-advanced",
    title: "MediCuro SurgiCut 400W | High-Frequency Digital Electrosurgical Generator (Monopolar & Bipolar)",
    sku: "MC-ESU-400PRO",
    brand: "MediCuro Global",
    category: "electrosurgical",
    subcategory: "electrosurgical-generator",
    basePrice: 2890.00,
    originalPrice: 3450.00,
    stock: 20,
    rating: 4.9,
    reviewCount: 44,
    isFeatured: true,
    isBestSeller: true,
    images: [
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80"
    ],
    shortDescription: "400W microprocessor-controlled electrosurgical unit with 7 monopolar and 3 bipolar surgical modes, instant tissue response feedback, and split-pad patient plate monitoring.",
    overview: "The SurgiCut 400W is an operating room powerhouse designed for general, laparoscopic, orthopedic, thoracic, and gynecological surgical procedures. Features advanced Return Electrode Contact Quality Monitoring (REM) to eliminate patient pad burn risks.",
    features: [
      "Pure Cut, Blend 1, Blend 2, Blend 3 for precise tissue dissection",
      "Fulguration, Spray, and Desiccation coagulation modes",
      "Standard and Precise Micro-Bipolar modes with auto-start feature",
      "REM Contact Quality Monitoring System with audible/visual safety alarms",
      "Laparoscopic underwater TURP / hysteroscopy cutting capability",
      "Stores 100 customized surgical program profiles"
    ],
    specifications: {
      "Maximum Output Power": "400W at 300Ω (Pure Cut), 120W (Fulgurate), 70W (Bipolar)",
      "Operating Frequency": "360 kHz to 480 kHz sinusoidal",
      "Output Channels": "2 Monopolar Handpiece Ports, 1 Bipolar Port",
      "Safety Circuit": "Patient Plate Return Monitor (CQM / REM)",
      "Leakage Current": "High frequency < 150 mA, Low frequency < 10 μA",
      "Cooling": "Convection without cooling fan (Sterile OR compliant)",
      "Dimensions": "410 x 360 x 145 mm",
      "Weight": "8.6 kg"
    },
    applications: [
      "General and visceral surgery",
      "Minimally invasive laparoscopic procedures",
      "Gynecological laparotomy and hysteroscopy",
      "Orthopedic joint replacement and spine surgery",
      "Transurethral Resection of the Prostate (TURP)"
    ],
    packageContents: [
      "SurgiCut 400W Main Generator Console",
      "2x Reusable Autoclavable Monopolar Electrosurgical Pencils with Cut/Coag Buttons",
      "1x Bipolar Bayonet Forceps (Titanium non-stick tips)",
      "1x Bipolar Connecting Cable (3 meters)",
      "5x Split Reusable Silicone Patient Return Plates with Cable",
      "Dual-pedal Explosion-proof Foot Switch",
      "Mains Power Cable and Earth Cable"
    ],
    powerRequirements: "110V / 220–240V AC Switchable, 50/60 Hz, 800 VA",
    certifications: ["ISO 13485:2016", "CE 0197", "IEC 60601-2-2 ESU Standard"],
    warranty: "3 Years Comprehensive OEM Warranty",
    shippingLeadTime: "3–5 Business Days"
  },
  {
    id: "prod-esu-02",
    slug: "electrosurgical-cautery-unit-100w",
    title: "MediCuro DermaCut 100W | Compact Radiofrequency Electrosurgical Skin Cautery",
    sku: "MC-ESU-CAUT100",
    brand: "MediCuro Global",
    category: "electrosurgical",
    subcategory: "electro-surgical-skin-cautery",
    basePrice: 980.00,
    originalPrice: 1250.00,
    stock: 35,
    rating: 4.7,
    reviewCount: 29,
    isFeatured: false,
    isBestSeller: true,
    images: [
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1583912267670-6575ad362e4b?auto=format&fit=crop&w=1000&q=80"
    ],
    shortDescription: "Compact 100W radiofrequency skin cautery designed for dermatology, plastic surgery, dental oral surgery, and minor outpatient procedures.",
    overview: "DermaCut 100W delivers finely tuned high-frequency cutting and coagulation with minimal lateral thermal damage. Ideal for skin tag removal, mole excision, blepharoplasty, and superficial dermatological lesions.",
    features: [
      "100W Pure Cut, Blend Cut, and Pinpoint Coagulation",
      "High frequency RF emission minimizes charring and accelerates healing",
      "Foot switch and hand pencil activation modes",
      "Compact desktop footprint suitable for outpatient treatment rooms"
    ],
    specifications: {
      "Max Power Output": "100 Watts at 500Ω",
      "Frequency": "1.7 MHz (True Radiofrequency)",
      "Control": "Digital step increments (1W resolution)",
      "Weight": "4.2 kg"
    },
    applications: [
      "Dermatology: Seborrheic keratosis, verrucae, skin tags, warts",
      "Plastic surgery: Blepharoplasty, skin grafting margins",
      "ENT: Epistaxis control, turbinate reduction",
      "Oral & maxillofacial minor surgeries"
    ],
    packageContents: [
      "DermaCut 100W Unit",
      "Monopolar Handpiece with 10 Assorted Active Electrodes (Needle, Loop, Ball)",
      "Neutral Patient Plate with Cable",
      "Pneumatic Foot Switch",
      "Power Cord and User Manual"
    ],
    powerRequirements: "110–230V AC, 50/60 Hz",
    certifications: ["ISO 13485", "CE Compliant"],
    warranty: "2 Years Warranty",
    shippingLeadTime: "2–4 Business Days"
  },

  // 3. CRYOSURGICAL EQUIPMENT
  {
    id: "prod-cryo-01",
    slug: "cryo-surgical-gun-master-500ml",
    title: "MediCuro CryoSurg Master 500ml | Liquid Nitrogen Cryosurgical Gun with 6 Precision Nozzles",
    sku: "MC-CRYO-500ML",
    brand: "MediCuro Global",
    category: "cryosurgery",
    subcategory: "cryo-surgical-guns",
    basePrice: 580.00,
    originalPrice: 720.00,
    stock: 60,
    rating: 4.9,
    reviewCount: 68,
    isFeatured: true,
    isBestSeller: true,
    images: [
      "https://images.unsplash.com/photo-1583912267670-6575ad362e4b?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1000&q=80"
    ],
    shortDescription: "Stainless steel liquid nitrogen cryosurgical device featuring double-walled vacuum insulation, fingertip flow trigger, and set of 6 interchangeable spray apertures.",
    overview: "The CryoSurg Master 500ml is precision-engineered for dermatologists, oncologists, gynecologists, and general practitioners performing cryo-ablation. It maintains liquid nitrogen at -196°C with low static evaporation, giving practitioners total control over freeze depth and margin size.",
    features: [
      "Double-walled stainless steel flask with high-vacuum thermal barrier",
      "Ergonomic handle with smooth fingertip pressure trigger release",
      "Comes with 6 precision spray nozzles (A, B, C, D, Curved, and Flat Spray)",
      "Safety relief valve prevents over-pressurization",
      "Static holding time up to 20–24 hours on full charge"
    ],
    specifications: {
      "Capacity": "500 ml (0.50 Liters)",
      "Operating Temperature": "-196°C (Liquid Nitrogen LN2)",
      "Material": "Medical Grade 304 Stainless Steel & Brass Core",
      "Static Holding Time": "20 to 24 hours",
      "Nozzle Orifice Sizes": "0.4 mm, 0.6 mm, 0.8 mm, 1.0 mm, plus angled probes",
      "Weight (Empty)": "850 grams",
      "Weight (Full LN2)": "1,260 grams"
    },
    applications: [
      "Actinic keratosis and basal cell carcinoma destruction",
      "Common viral warts (Verruca vulgaris) and plantar warts",
      "Molluscum contagiosum and keloid scar softening",
      "Cervical ectropion and dysplasia in gynaecology"
    ],
    packageContents: [
      "CryoSurg Master 500ml Flask with Trigger Head Assembly",
      "Set of 6 Stainless Steel Spray Tips with protective holder",
      "Protective Insulated Thermal Silicone Grip",
      "Carry Case with Precision Foam Cutouts",
      "User Operation & Cryotherapy Temperature Guide"
    ],
    powerRequirements: "Passive Cryogenic (Non-electrical)",
    certifications: ["ISO 13485:2016", "CE Medical Class IIa"],
    warranty: "5 Years Vacuum Flask Integrity Warranty",
    shippingLeadTime: "2–4 Business Days"
  },
  {
    id: "prod-cryo-02",
    slug: "cryotherapy-system-clinical-cart",
    title: "MediCuro CryoClinic Pro | Clinical Liquid Nitrogen System with Dewar Storage",
    sku: "MC-CRYO-CART30",
    brand: "MediCuro Global",
    category: "cryosurgery",
    subcategory: "cryotherapy-systems",
    basePrice: 1850.00,
    originalPrice: 2200.00,
    stock: 14,
    rating: 4.8,
    reviewCount: 16,
    isFeatured: false,
    isBestSeller: false,
    images: [
      "https://images.unsplash.com/photo-1583912267670-6575ad362e4b?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80"
    ],
    shortDescription: "Complete clinical cryotherapy suite including 300ml Cryo Gun, 10-liter LN2 storage dewar flask, withdrawal device, and mobile clinical trolley.",
    overview: "Designed for busy outpatient clinics, this turnkey cryotherapy suite includes long-term cryogenic storage, safe liquid nitrogen withdrawal without manual pouring, and precision handheld cryosurgical applicators on a mobile anti-static trolley.",
    features: [
      "10-Liter aluminum storage dewar with static holding time of 60+ days",
      "Safe pressure-dispensing withdrawal device for filling cryo gun without spillage",
      "Includes 350ml Cryo Gun with 8 tip attachments and cryo-chambers",
      "Mobile rolling base with locking casters"
    ],
    specifications: {
      "Dewar Volume": "10 Liters",
      "Cryo Gun Volume": "350 ml",
      "Static Holding Time": "60 days (Storage Tank)",
      "Trolley Dimensions": "600 x 500 x 920 mm",
      "Total Shipping Weight": "22 kg"
    },
    applications: ["Comprehensive outpatient dermatology and cryo-oncology"],
    packageContents: [
      "10L Liquid Nitrogen Dewar Tank",
      "LN2 Dispensing Withdrawal Pump",
      "350ml Cryo Surgical Gun with 8 Nozzles",
      "Mobile 4-Caster Utility Trolley",
      "Cryogenic Handling Gloves and Protective Visor"
    ],
    powerRequirements: "Non-electrical cryogenic operation",
    certifications: ["ISO 13485", "CE Medical"],
    warranty: "3 Years Warranty",
    shippingLeadTime: "4–7 Business Days"
  },

  // 4. OT / SURGICAL LIGHTS
  {
    id: "prod-ot-01",
    slug: "double-dome-led-surgical-ot-light-160k-lux",
    title: "MediCuro Lumina 700+500 Dual Dome | Ceiling Mounted Shadowless LED Surgical Light",
    sku: "MC-OT-LUM750",
    brand: "MediCuro Global",
    category: "ot-lights",
    subcategory: "ot-surgical-lights-double-dome",
    basePrice: 2490.00,
    originalPrice: 3100.00,
    stock: 16,
    rating: 4.9,
    reviewCount: 57,
    isFeatured: true,
    isBestSeller: true,
    images: [
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1000&q=80"
    ],
    shortDescription: "Premium dual-dome shadowless LED surgical illumination system delivering 160,000 + 120,000 Lux with CRI ≥ 96, adjustable color temperature (3800K–5000K), and 360° German balance arms.",
    overview: "The Lumina 700+500 Dual Dome is engineered for major surgical suites requiring exceptional depth of illumination and shadow management. Multi-matrix Osram LED arrays eliminate shadows cast by surgical teams, while laminar flow aerodynamic dome contours maintain cleanroom airflow in modern ORs.",
    features: [
      "High-intensity shadowless lighting: 160,000 Lux (Major Dome) + 120,000 Lux (Satellite Dome)",
      "High Color Rendering Index (CRI Ra ≥ 96, R9 ≥ 94) for vivid tissue discrimination",
      "Adjustable color temperature: 3,800K to 5,000K (4 presets)",
      "Sterilizable central handle with one-touch focus adjustment",
      "Touch screen control console on lighthead yoke with Endo-light mode for laparoscopy",
      "German spring-loaded suspension balance arm with 360° unlimited rotation",
      "Ultra-long LED lifespan ≥ 60,000 hours with low temperature rise (< 1°C at surgeon's head)"
    ],
    specifications: {
      "Illuminance (Lux at 1m)": "Major Dome: 160,000 Lux | Minor Dome: 120,000 Lux",
      "Dome Diameters": "Major: 700 mm (84 LEDs) | Minor: 500 mm (54 LEDs)",
      "Color Temperature": "3,800K, 4,200K, 4,600K, 5,000K adjustable",
      "Color Rendering Index (Ra)": "≥ 96 | R9 ≥ 94",
      "Spot Diameter (d10)": "160 mm to 300 mm adjustable",
      "Illumination Depth (L1+L2 at 20%)": "≥ 1,200 mm",
      "LED Service Lifespan": "≥ 60,000 hours",
      "Temperature Rise at Field": "≤ 1°C",
      "Balance Arm System": "German imported Ondal style spring arm, 360° rotation",
      "Mounting": "Ceiling Mounted (Custom height flange available)"
    },
    applications: [
      "Open heart and cardiovascular surgery",
      "Neurosurgery and orthopedic trauma",
      "General abdominal and colorectal procedures",
      "Minimally invasive laparoscopic surgery (Endo mode)"
    ],
    packageContents: [
      "Lumina 700mm Major LED Surgical Lighthead",
      "Lumina 500mm Minor LED Surgical Lighthead",
      "Dual Heavy-duty Ceiling Articulating Suspension System",
      "Central Ceiling Mounting Flange & Extension Column",
      "4x Detachable Autoclavable Sterilizable Central Handles",
      "Dual Integrated Touch Panel Controls",
      "Installation Hardware & Structural Ceiling Fasteners"
    ],
    powerRequirements: "100–240V AC, 50/60 Hz, 160W max total power consumption",
    certifications: ["ISO 13485:2016", "CE Medical Device Directive", "IEC 60601-2-41 OT Light Standard"],
    warranty: "5 Years Manufacturer Warranty on LED Modules and Structure",
    shippingLeadTime: "5–8 Business Days (Reinforced Export Wooden Crate)"
  },
  {
    id: "prod-ot-02",
    slug: "single-dome-ceiling-ot-light-140k-lux",
    title: "MediCuro Stellar 500 Single Dome | Ceiling Mounted LED Surgical OT Lamp",
    sku: "MC-OT-STEL500",
    brand: "MediCuro Global",
    category: "ot-lights",
    subcategory: "single-dome-ot-lights",
    basePrice: 1650.00,
    originalPrice: 1990.00,
    stock: 22,
    rating: 4.8,
    reviewCount: 33,
    isFeatured: false,
    isBestSeller: true,
    images: [
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1000&q=80"
    ],
    shortDescription: "140,000 Lux ceiling-mounted single dome surgical light with 54 high-intensity cold LEDs, touch brightness control, and shadow-reduction optic lens.",
    overview: "Ideal for minor operating theatres, ambulatory surgery centers, and emergency trauma rooms. Combines powerful shadowless output with an ultra-slim aerodynamic profile for low-clearance OR ceilings.",
    features: [
      "140,000 Lux brightness with 10-step digital dimming",
      "High CRI ≥ 95 with natural day-white 4300K color temperature",
      "Removable sterilizable central positioning handle",
      "360° continuous swivel joints for pinpoint positioning"
    ],
    specifications: {
      "Illuminance": "Up to 140,000 Lux at 1 meter",
      "Dome Diameter": "500 mm",
      "Number of LEDs": "54 High-Power Osram Medical LEDs",
      "CRI": "≥ 95",
      "Spot Diameter": "160–280 mm",
      "Mounting": "Ceiling Mounted (Compatible with 2.6m – 3.2m ceiling heights)"
    },
    applications: ["Day surgery, obstetrics, plastic surgery, emergency trauma"],
    packageContents: [
      "Stellar 500mm Light Dome with Arm",
      "Ceiling Mount Flange and Tube",
      "2x Autoclavable Handles",
      "Wall/Arm Digital Control Box",
      "Manual & Mounting Hardware"
    ],
    powerRequirements: "110–240V AC, 50/60 Hz, 80W",
    certifications: ["ISO 13485", "CE Compliant"],
    warranty: "5 Years LED & Arm Warranty",
    shippingLeadTime: "4–6 Business Days"
  },
  {
    id: "prod-ot-03",
    slug: "mobile-led-ot-surgical-light-battery-backup",
    title: "MediCuro MobilLux 300 | Mobile Stand LED Surgical Light with 4-Hour Battery Backup",
    sku: "MC-OT-MOBL300",
    brand: "MediCuro Global",
    category: "ot-lights",
    subcategory: "mobile-led-ot-lights",
    basePrice: 1390.00,
    originalPrice: 1680.00,
    stock: 28,
    rating: 4.9,
    reviewCount: 41,
    isFeatured: true,
    isBestSeller: true,
    images: [
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80"
    ],
    shortDescription: "Heavy-duty mobile floor-stand surgical light producing 100,000 Lux with integrated emergency rechargeable battery backup sustaining up to 4 hours of uninterrupted operation.",
    overview: "The MobilLux 300 provides surgical illumination anywhere in the hospital. Featuring a low-center-of-gravity cast base with anti-static locking casters and seamless automatic battery switchover during power interruptions.",
    features: [
      "100,000 Lux output with uniform spot field",
      "Built-in rechargeable lithium-ion battery (up to 4 hours runtime)",
      "Seamless instant switch to battery when AC power fails",
      "Ultra-stable 5-point castor base with dual wheel foot brakes",
      "Gooseneck and spring counterbalanced arm for effortless adjustment"
    ],
    specifications: {
      "Illuminance": "100,000 Lux at 1 meter",
      "Battery Runtime": "≥ 4 hours at maximum brightness",
      "Charge Time": "3.5 hours to 100%",
      "CRI": "≥ 95",
      "Base Diameter": "620 mm with medical anti-static casters",
      "Total Weight": "32 kg (Stability weighted)"
    },
    applications: [
      "Emergency departments and field surgical hospitals",
      "Intensive Care Units (ICU) and bedside surgical procedures",
      "Obstetric delivery rooms and minor operating suites",
      "Backup emergency lighting for critical surgical wards"
    ],
    packageContents: [
      "MobilLux 300 Floor Stand Assembly with Integrated Battery",
      "Spring Articulated Lighthead Arm",
      "Autoclavable Handle",
      "Heavy-duty Hospital Grade Power Cord",
      "Battery Level Indicator & Charger"
    ],
    powerRequirements: "100–240V AC, 50/60 Hz and 24V Internal Battery",
    certifications: ["ISO 13485:2016", "CE Marked", "IEC 60601-1-2"],
    warranty: "3 Years Unit Warranty (1 Year Battery)",
    shippingLeadTime: "3–5 Business Days"
  },

  // 5. EXAMINATION & OT TABLES
  {
    id: "prod-tbl-01",
    slug: "electric-operating-table-multipurpose-surgibase",
    title: "MediCuro SurgiBase 3000 | Electro-Hydraulic Multipurpose Operating Theatre Table",
    sku: "MC-TBL-SB3000",
    brand: "MediCuro Global",
    category: "tables",
    subcategory: "operating-tables",
    basePrice: 5200.00,
    originalPrice: 6400.00,
    stock: 8,
    rating: 5.0,
    reviewCount: 22,
    isFeatured: true,
    isBestSeller: true,
    images: [
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80"
    ],
    shortDescription: "Universal electro-hydraulic surgical operating table with 300 kg safe working load, C-arm X-ray radiolucent tabletop, longitudinal sliding, and motorized positioning.",
    overview: "The SurgiBase 3000 provides high surgical versatility for general surgery, orthopedics, neurosurgery, urology, and cardio-thoracic interventions. Features motorized Trendelenburg, reverse Trendelenburg, lateral tilt, and longitudinal sliding for C-arm fluoroscopy access.",
    features: [
      "Full electro-hydraulic movements with micro-touch hand control and base auxiliary panel",
      "Longitudinal tabletop shift of 350 mm for full C-arm fluoroscopic clearance",
      "High load capacity of 300 kg (660 lbs) with high operational stability",
      "Memory foam antistatic waterproof mattress with high pressure-relieving characteristics",
      "Built-in battery backup for up to 80 full surgical positional cycles"
    ],
    specifications: {
      "Tabletop Dimensions": "2,100 mm x 520 mm",
      "Height Adjustment": "680 mm to 1,000 mm (Motorized)",
      "Trendelenburg / Reverse": "≥ 25° / ≥ 25°",
      "Lateral Tilt (Left / Right)": "≥ 20° / ≥ 20°",
      "Back Plate Adjustment": "+75° to -20°",
      "Leg Plate Adjustment": "+15° to -90° (Split & detachable)",
      "Longitudinal Sliding": "350 mm for C-Arm imaging",
      "Maximum Weight Capacity": "300 kg (660 lbs)",
      "Chassis Material": "Medical Grade 304 Brushed Stainless Steel",
      "Total Weight": "260 kg"
    },
    applications: [
      "General laparotomy and laparoscopic surgery",
      "Orthopedic trauma and total joint replacement",
      "Neurosurgery and spinal interventions",
      "Urological and gynecological surgical procedures"
    ],
    packageContents: [
      "SurgiBase 3000 Table with Electro-hydraulic System",
      "Antistatic Memory Mattress Set (Detachable)",
      "Digital Wired Hand Pendant Controller",
      "Set of 2 Arm Boards with Straps",
      "Set of 2 Lateral Body Supports",
      "Set of 2 Shoulder Crutches",
      "Anesthesia Screen Frame",
      "Internal Rechargeable Battery & Power Cable"
    ],
    powerRequirements: "110–240V AC, 50/60 Hz and 24V Internal Battery",
    certifications: ["ISO 13485:2016", "CE 0123", "IEC 60601-2-46 Operating Table Standard"],
    warranty: "3 Years Comprehensive Electro-Hydraulic Warranty",
    shippingLeadTime: "7–10 Business Days (Heavy-duty Sea/Air Crate)"
  },
  {
    id: "prod-tbl-02",
    slug: "hydraulic-examination-table-clinical",
    title: "MediCuro CareBed Pro | Hydraulic Height-Adjustable Clinical Examination Table",
    sku: "MC-TBL-EXM200",
    brand: "MediCuro Global",
    category: "tables",
    subcategory: "examination-tables",
    basePrice: 1250.00,
    originalPrice: 1550.00,
    stock: 25,
    rating: 4.8,
    reviewCount: 30,
    isFeatured: false,
    isBestSeller: true,
    images: [
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=80"
    ],
    shortDescription: "Heavy-duty hydraulic examination and treatment couch with bilateral foot pedal elevation, gas-spring assisted backrest, and seamless antimicrobial upholstery.",
    overview: "Built for hospital consultation suites, physiotherapy clinics, and health centers. Features smooth hydraulic pump elevation requiring no electrical hookup, making it versatile across global clinic environments.",
    features: [
      "Foot pump hydraulic lift on both sides of table",
      "Gas-spring assisted backrest elevation from 0° to 75°",
      "Seamless hospital-grade vinyl upholstery resistant to disinfectant solutions",
      "Retractable wheel carriage with single central foot lever"
    ],
    specifications: {
      "Dimensions": "1,950 mm x 680 mm",
      "Height Range": "500 mm to 920 mm (Hydraulic Foot Pump)",
      "Backrest Angle": "0° to +75° (Gas Strut)",
      "Load Capacity": "220 kg (485 lbs)",
      "Weight": "85 kg"
    },
    applications: ["General outpatient consultation, clinical diagnostics, minor therapy"],
    packageContents: [
      "CareBed Pro Hydraulic Couch",
      "Paper Roll Dispenser Bar",
      "Integrated Retractable Central Castor System",
      "Assembly Tools and Maintenance Manual"
    ],
    powerRequirements: "Manual Hydraulic (Non-electrical)",
    certifications: ["ISO 13485", "CE Compliant"],
    warranty: "3 Years Frame & Hydraulic Pump Warranty",
    shippingLeadTime: "4–6 Business Days"
  },

  // 6. OBSTETRICS & GYNAECOLOGY
  {
    id: "prod-obg-01",
    slug: "motorized-obstetric-delivery-bed-luna",
    title: "MediCuro LunaCare LDR | Motorized Obstetric Labor & Delivery Table",
    sku: "MC-OBG-LDR500",
    brand: "MediCuro Global",
    category: "ob-gyn",
    subcategory: "obstetric-tables",
    basePrice: 3950.00,
    originalPrice: 4750.00,
    stock: 10,
    rating: 4.9,
    reviewCount: 25,
    isFeatured: true,
    isBestSeller: true,
    images: [
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1000&q=80"
    ],
    shortDescription: "Full-feature electric Labor, Delivery & Recovery (LDR) obstetric bed with motorized back, height, and Trendelenburg adjustments, retractable leg section, and stainless fluid basin.",
    overview: "LunaCare LDR seamlessly transitions from a comfortable labor bed to a specialized delivery platform. Designed with maternal comfort and immediate obstetric emergency access in mind.",
    features: [
      "Motorized height, backrest, and Trendelenburg adjustments with hand controller and nurse lockout panel",
      "Telescopic sliding leg section retracts smoothly beneath seat for birthing position",
      "Integrated multi-axis padded leg crutches (lithotomy supports)",
      "Slide-out stainless steel fluid collection basin with drainage hose",
      "Fold-down side rails with integrated ergonomic push handles for labor pushing"
    ],
    specifications: {
      "Overall Length": "2,050 mm (Bed mode) | 1,450 mm (Delivery mode)",
      "Width": "880 mm (Over side rails)",
      "Height Range": "580 mm to 980 mm",
      "Backrest Elevation": "0° to 70°",
      "Trendelenburg": "≥ 12°",
      "Safe Working Load": "250 kg (550 lbs)",
      "Total Weight": "180 kg"
    },
    applications: [
      "Labor, delivery, and post-partum recovery in maternity hospitals",
      "Emergency Cesarean transition and operative deliveries",
      "Perineal repair and obstetric examinations"
    ],
    packageContents: [
      "LunaCare LDR Obstetric Bed Frame",
      "Antimicrobial Waterproof Seamless Birthing Mattress",
      "Pair of Padded Lithotomy Leg Crutches with Ball Joints",
      "Stainless Steel Debris & Fluid Basin",
      "Pair of Ergonomic Pull Handles",
      "IV Pole and Oxygen Cylinder Holder"
    ],
    powerRequirements: "100–240V AC, 50/60 Hz and internal emergency backup battery",
    certifications: ["ISO 13485:2016", "CE Marked", "IEC 60601-2-52"],
    warranty: "3 Years Comprehensive Warranty",
    shippingLeadTime: "6–9 Business Days (Export Crate)"
  },
  {
    id: "prod-obg-02",
    slug: "fetal-doppler-heart-rate-monitor",
    title: "MediCuro FetalBeat Pro | Dual Ultrasound Clinical Fetal Doppler Monitor with Twins Detection",
    sku: "MC-OBG-FHR200",
    brand: "MediCuro Global",
    category: "ob-gyn",
    subcategory: "fetal-monitoring-equipment",
    basePrice: 1150.00,
    originalPrice: 1400.00,
    stock: 30,
    rating: 4.8,
    reviewCount: 36,
    isFeatured: false,
    isBestSeller: true,
    images: [
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=80"
    ],
    shortDescription: "Advanced antepartum fetal and maternal monitor featuring high-sensitivity 1 MHz pulsed Doppler probes, automatic twin FHR separation, and built-in thermal recorder.",
    overview: "The FetalBeat Pro provides continuous, non-invasive monitoring of fetal heart rates (FHR), uterine contraction activity (TOCO), and fetal movement (FM). Equipped with a 12.1-inch tiltable high-definition screen and central monitoring network connectivity.",
    features: [
      "12.1-inch color TFT display tiltable up to 60 degrees",
      "High-sensitivity 12-crystal waterproof ultrasound transducers",
      "Dual FHR monitoring with acoustic signal separation for twins",
      "Wide-format 152mm thermal printer with high-speed printing",
      "Continuous 24-hour trace waveform storage and review"
    ],
    specifications: {
      "Display": "12.1-inch Color LCD Touchscreen",
      "Ultrasound Frequency": "1.0 MHz ± 10%",
      "FHR Measurement Range": "50–240 BPM ± 1 BPM",
      "TOCO Range": "0–100 relative units",
      "Recorder": "Built-in 152 mm High Resolution Thermal Printer",
      "Weight": "5.6 kg"
    },
    applications: ["Antepartum fetal well-being assessment, Non-Stress Test (NST), labor ward monitoring"],
    packageContents: [
      "FetalBeat Pro Main Monitor",
      "2x Waterproof FHR Ultrasound Probes",
      "1x TOCO Uterine Contraction Probe",
      "1x Maternal Event Marker Button",
      "3x Elastic Probe Abdominal Belts",
      "Thermal Recording Paper (Pack of 3 Packs)"
    ],
    powerRequirements: "100–240V AC, 50/60 Hz and built-in lithium rechargeable battery",
    certifications: ["ISO 13485:2016", "CE 0123", "IEC 60601-2-37"],
    warranty: "2 Years Warranty",
    shippingLeadTime: "3–5 Business Days"
  }
];

module.exports = products;
