const categories = [
  {
    id: "physiotherapy",
    slug: "physiotherapy",
    name: "Physiotherapy Machines",
    status: "ACTIVE",
    active: true,
    reviewGated: true,
    shortDescription: "Advanced electrotherapy and physical rehabilitation systems engineered for clinics and hospitals.",
    icon: "Activity",
    featuredImage: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
    subcategories: [
      { id: "ultrasound-therapy-machines", slug: "ultrasound-therapy-machines", name: "Ultrasound Therapy Machines" },
      { id: "tens-machines", slug: "tens-machines", name: "TENS Machines" },
      { id: "laser-therapy-machine", slug: "laser-therapy-machine", name: "Laser Therapy Machines" },
      { id: "cpm", slug: "cpm", name: "CPM Machines" },
      { id: "shortwave-diathermy-machine", slug: "shortwave-diathermy-machine", name: "Short Wave Diathermy Machines" },
      { id: "longwave-diathermy-machine", slug: "longwave-diathermy-machine", name: "Long Wave Diathermy Machines" },
      { id: "shockwave-therapy-machine", slug: "shockwave-therapy-machine", name: "Shock Wave Therapy Machines" },
      { id: "electronic-traction-machine", slug: "electronic-traction-machine", name: "Electronic Traction Machines" },
      { id: "electric-muscle-stimulator", slug: "electric-muscle-stimulator", name: "Electric Muscle Stimulators" }
    ]
  },
  {
    id: "electrosurgical-units",
    slug: "electrosurgical-units",
    name: "Electrosurgical Units",
    status: "ACTIVE",
    active: true,
    shortDescription: "High-frequency precision electrosurgical generators and cautery systems for modern ORs.",
    icon: "Zap",
    featuredImage: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80",
    subcategories: [
      { id: "electrosurgical-surgery", slug: "electrosurgical-surgery", name: "Electrosurgical Surgery" },
      { id: "electrosurgical-generator", slug: "electrosurgical-generator", name: "Electrosurgical Generators" }
    ]
  },
  {
    id: "cryo-surgical",
    slug: "cryo-surgical",
    name: "Cryosurgical Equipment",
    status: "ACTIVE",
    active: true,
    shortDescription: "Liquid nitrogen cryotherapy guns, multi-nozzle spray sets, and surgical cryo systems.",
    icon: "ThermometerSnowflake",
    featuredImage: "https://images.unsplash.com/photo-1583912267670-6575ad362e4b?auto=format&fit=crop&w=800&q=80",
    subcategories: [
      { id: "cryo-guns", slug: "cryo-gun", name: "Cryo Surgical Guns" },
      { id: "cryo-systems", slug: "cryotherapy-systems", name: "Cryotherapy Systems" },
      { id: "cryo-nozzles", slug: "cryo-replacement-nozzles", name: "Replacement Nozzles & Accessories" }
    ]
  },
  {
    id: "ot-lights",
    slug: "ot-lights",
    name: "OT / Surgical Lights",
    status: "ACTIVE",
    active: true,
    shortDescription: "Shadowless LED surgical illumination systems engineered with high CRI and cold-light optics.",
    icon: "Sun",
    featuredImage: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80",
    subcategories: [
      { id: "single-dome", slug: "single-dome-ot-lights", name: "Single Dome OT Lights" },
      { id: "double-dome", slug: "ot-surgical-lights-double-dome", name: "Double Dome OT Lights" },
      { id: "mobile-lights", slug: "mobile-led-ot-lights", name: "Mobile OT Lights" }
    ]
  },
  {
    id: "examination-ot-tables",
    slug: "examination-ot-tables",
    name: "Examination & OT Tables",
    status: "ACTIVE",
    active: true,
    shortDescription: "Heavy-duty electric operating theatre tables, hydraulic surgical couches, and clinical examination beds.",
    icon: "Bed",
    featuredImage: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80",
    subcategories: [
      { id: "ot-tables", slug: "operating-tables", name: "Operating Tables" },
      { id: "exam-tables", slug: "examination-tables", name: "Examination Tables" },
      { id: "treatment-tables", slug: "treatment-tables", name: "Treatment & Rehabilitation Couches" }
    ]
  },
  {
    id: "obstetrics-and-gynaecology",
    slug: "obstetrics-and-gynaecology",
    name: "Obstetrics & Gynaecology",
    status: "ACTIVE",
    active: true,
    shortDescription: "Specialized maternal delivery tables, gynaecological examination beds, and fetal monitoring instruments.",
    icon: "HeartPulse",
    featuredImage: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
    subcategories: [
      { id: "obstetric-tables", slug: "obstetric-tables", name: "Obstetric Delivery Tables" },
      { id: "gynae-tables", slug: "gynaecology-examination-tables", name: "Gynaecology Examination Tables" },
      { id: "fetal-care", slug: "fetal-monitoring-equipment", name: "Fetal Doppler & Monitoring" }
    ]
  },
  {
    id: "medical-equipment",
    slug: "medical-equipment",
    name: "General Medical Equipment",
    status: "ACTIVE",
    active: true,
    shortDescription: "Diagnostic equipment, medical trolleys, surgical headlights, and emergency equipment.",
    icon: "Activity",
    featuredImage: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80",
    subcategories: [
      { id: "diagnostic", slug: "diagnostic-equipment", name: "Diagnostic Instruments" },
      { id: "headlights", slug: "surgical-headlights", name: "Surgical Headlights" },
      { id: "trolleys", slug: "medical-trolleys", name: "Medical Equipment Trolleys" },
      { id: "insufflators", slug: "laparoscopic-insufflation", name: "Laparoscopic Insufflators" },
      { id: "biopsy-instruments", slug: "surgical-instruments-biopsy", name: "Biopsy & Minor Surgery Instruments" }
    ]
  }
];

module.exports = categories;
