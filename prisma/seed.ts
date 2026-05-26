import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Default admin account
  const adminEmail    = 'admin@hospital.com'
  const adminPassword = 'Admin@123'
  const existing      = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!existing) {
    await prisma.user.create({
      data: {
        name:     'Admin',
        email:    adminEmail,
        password: await bcrypt.hash(adminPassword, 12),
        role:     'ADMIN' as never,
      },
    })
    console.log(`Created admin user: ${adminEmail} / ${adminPassword}`)
    console.log('  ⚠️  Change this password after first login!')
  } else {
    console.log(`Admin user already exists: ${adminEmail}`)
  }

  console.log('\nSeeding global labs and tests...')

  // Global labs — common in pediatric/general hospital settings
  const labsData = [
    { name: 'Hematology Lab',    openingTime: '08:00', closingTime: '10:00' },
    { name: 'Biochemistry Lab',  openingTime: '08:00', closingTime: '12:00' },
    { name: 'Urine Analysis Lab',openingTime: '07:30', closingTime: '09:30' },
    { name: 'Microbiology Lab',  openingTime: '08:00', closingTime: '11:00' },
    { name: 'Radiology',         openingTime: '08:00', closingTime: '17:00' },
    { name: 'Blood Bank',        openingTime: '08:00', closingTime: '14:00' },
    { name: 'Immunology Lab',    openingTime: '09:00', closingTime: '13:00' },
  ]

  const createdLabs: Record<string, string> = {}

  for (const lab of labsData) {
    const existing = await prisma.lab.findFirst({
      where: { name: lab.name, isGlobal: true },
    })
    if (!existing) {
      const created = await prisma.lab.create({
        data: { ...lab, isGlobal: true },
      })
      createdLabs[lab.name] = created.id
      console.log(`  Created lab: ${lab.name}`)
    } else {
      createdLabs[lab.name] = existing.id
      console.log(`  Skipped (exists): ${lab.name}`)
    }
  }

  // Global tests — common pediatric investigations
  const testsData = [
    // Hematology
    { name: 'CBC (Complete Blood Count)',  lab: 'Hematology Lab' },
    { name: 'ESR',                         lab: 'Hematology Lab' },
    { name: 'Peripheral Blood Smear',      lab: 'Hematology Lab' },
    { name: 'PT/INR',                      lab: 'Hematology Lab' },
    { name: 'aPTT',                        lab: 'Hematology Lab' },
    { name: 'Reticulocyte Count',          lab: 'Hematology Lab' },

    // Biochemistry
    { name: 'Blood Sugar (Fasting)',       lab: 'Biochemistry Lab' },
    { name: 'Blood Sugar (Post-Prandial)', lab: 'Biochemistry Lab' },
    { name: 'LFT (Liver Function Tests)',  lab: 'Biochemistry Lab' },
    { name: 'KFT (Kidney Function Tests)', lab: 'Biochemistry Lab' },
    { name: 'Serum Electrolytes',          lab: 'Biochemistry Lab' },
    { name: 'CRP (C-Reactive Protein)',    lab: 'Biochemistry Lab' },
    { name: 'Serum Calcium',               lab: 'Biochemistry Lab' },
    { name: 'Serum Phosphorus',            lab: 'Biochemistry Lab' },
    { name: 'Thyroid Profile (T3/T4/TSH)', lab: 'Biochemistry Lab' },
    { name: 'Serum Albumin',               lab: 'Biochemistry Lab' },
    { name: 'Serum Bilirubin (Total/Direct)', lab: 'Biochemistry Lab' },
    { name: 'Blood Gas Analysis (ABG)',    lab: 'Biochemistry Lab' },

    // Urine
    { name: 'Urine Routine & Microscopy', lab: 'Urine Analysis Lab' },
    { name: 'Urine Protein-Creatinine Ratio', lab: 'Urine Analysis Lab' },

    // Microbiology
    { name: 'Blood Culture & Sensitivity', lab: 'Microbiology Lab' },
    { name: 'Urine Culture & Sensitivity', lab: 'Microbiology Lab' },
    { name: 'CSF Culture & Sensitivity',   lab: 'Microbiology Lab' },
    { name: 'Throat Swab Culture',         lab: 'Microbiology Lab' },
    { name: 'Dengue NS1 / IgM / IgG',     lab: 'Microbiology Lab' },
    { name: 'Malaria Antigen (RDT)',       lab: 'Microbiology Lab' },
    { name: 'Widal Test',                  lab: 'Microbiology Lab' },

    // Radiology
    { name: 'X-Ray Chest (PA)',            lab: 'Radiology' },
    { name: 'X-Ray Abdomen',               lab: 'Radiology' },
    { name: 'Ultrasound Abdomen',          lab: 'Radiology' },
    { name: 'Echocardiogram',              lab: 'Radiology' },

    // Blood Bank
    { name: 'Blood Group & Rh Typing',    lab: 'Blood Bank' },
    { name: 'Cross-Match',                lab: 'Blood Bank' },

    // Immunology
    { name: 'ANA (Antinuclear Antibody)', lab: 'Immunology Lab' },
    { name: 'ASO Titre',                  lab: 'Immunology Lab' },
    { name: 'RA Factor',                  lab: 'Immunology Lab' },
    { name: 'Immunoglobulins (IgG/IgA/IgM)', lab: 'Immunology Lab' },
  ]

  for (const test of testsData) {
    const labId = createdLabs[test.lab]
    if (!labId) {
      console.warn(`  Lab not found for test: ${test.name}`)
      continue
    }
    const existing = await prisma.test.findFirst({
      where: { name: test.name, isGlobal: true },
    })
    if (!existing) {
      await prisma.test.create({
        data: { name: test.name, labId, isGlobal: true },
      })
      console.log(`  Created test: ${test.name}`)
    } else {
      console.log(`  Skipped (exists): ${test.name}`)
    }
  }

  console.log('Seeding complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
