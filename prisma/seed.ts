import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const POSITIONS = [
  'Software Engineer',
  'Marketing Executive', 
  'Business Analyst',
  'Project Manager',
  'UX Designer',
  'Data Analyst',
]

const ALL_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'SQL', 'Java',
  'Marketing Strategy', 'SEO', 'Content Writing', 'Social Media',
  'Business Analysis', 'Requirements Gathering', 'Stakeholder Management',
  'Project Management', 'Agile', 'Scrum', 'Jira',
  'Figma', 'UI/UX Design', 'Prototyping',
  'Data Analysis', 'Excel', 'Power BI', 'Tableau',
  'Communication', 'Leadership', 'Problem Solving',
]

const STATUSES = ['New', 'Screening', 'Interview', 'Hired', 'Rejected']

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomSkills(): string[] {
  const count = Math.floor(Math.random() * 4) + 3 // 3 to 6 skills
  const shuffled = [...ALL_SKILLS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing data in correct order
  await prisma.cvUploadItem.deleteMany()
  await prisma.cvUploadBatch.deleteMany()
  await prisma.applicationStatusHistory.deleteMany()
  await prisma.application.deleteMany()
  await prisma.campaign.deleteMany()
  await prisma.candidate.deleteMany()
  await prisma.user.deleteMany()

  // Create users
  const adminPassword = await bcrypt.hash('Admin@123', 12)
  const hrPassword = await bcrypt.hash('Hr@123456', 12)

  const admin = await prisma.user.create({
    data: { fullName: 'Nguyễn Quản Trị', email: 'admin@gapsoftware.asia', passwordHash: adminPassword, role: 'admin' },
  })
  const hr1 = await prisma.user.create({
    data: { fullName: 'Trần Thị Hương', email: 'huong.tran@gapsoftware.asia', passwordHash: hrPassword, role: 'hr' },
  })
  const hr2 = await prisma.user.create({
    data: { fullName: 'Lê Văn Minh', email: 'minh.le@gapsoftware.asia', passwordHash: hrPassword, role: 'hr' },
  })

  // Create Campaigns
  const campaign1 = await prisma.campaign.create({
    data: { name: 'Thực tập sinh IT 2026', isOpen: true, createdById: admin.id }
  })
  const campaign2 = await prisma.campaign.create({
    data: { name: 'Tuyển dụng Senior Q3', isOpen: true, createdById: admin.id }
  })
  const campaigns = [campaign1, campaign2]

  const candidateNames = [
    'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Cường', 'Phạm Thị Dung',
    'Hoàng Văn Đức', 'Vũ Thị Hoa', 'Đặng Văn Hùng', 'Bùi Thị Lan',
    'Đỗ Văn Long', 'Ngô Thị Mai', 'Dương Văn Nam', 'Lý Thị Nga',
    'Trịnh Văn Phong', 'Lưu Thị Quỳnh', 'Đinh Văn Sơn', 'Tạ Thị Thảo',
    'Phan Văn Tuấn', 'Cao Thị Uyên', 'Mai Văn Vinh', 'Hà Thị Xuân',
  ]

  const users = [admin, hr1, hr2]
  const applications = []

  // Create Candidates and their Applications
  for (let i = 0; i < 20; i++) {
    const name = candidateNames[i]
    const firstName = name.split(' ').pop()!.toLowerCase()
    const status = STATUSES[i % STATUSES.length]
    const position = randomFrom(POSITIONS)
    const skills = randomSkills()
    const yearsExp = Math.floor(Math.random() * 8) + 1
    const createdBy = randomFrom(users)
    const campaign = randomFrom(campaigns)

    const candidate = await prisma.candidate.create({
      data: {
        fullName: name,
        email: `${firstName}${i + 1}@gmail.com`,
        phone: `09${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
        yearsExperience: yearsExp,
        skills: JSON.stringify(skills),
        createdById: createdBy.id,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      },
    })

    const app = await prisma.application.create({
      data: {
        candidateId: candidate.id,
        campaignId: campaign.id,
        appliedPosition: position,
        currentStatus: status,
        cvFileName: `CV_${name.replace(/\s/g, '_')}.pdf`,
        cvFilePath: `/uploads/sample_cv_${i + 1}.pdf`,
        parseStatus: 'success',
        createdAt: candidate.createdAt,
      }
    })
    applications.push(app)
  }

  console.log('✅ Created 20 candidates and applications')

  // Create status history for first 5 applications
  const historyNotes = [
    'CV ấn tượng, kỹ năng phù hợp yêu cầu',
    'Đã liên hệ lịch phỏng vấn',
    'Phỏng vấn tốt, tiến hành vòng 2',
    'Ứng viên chưa đáp ứng yêu cầu kỹ thuật',
    'Đã gửi offer letter',
  ]

  for (let i = 0; i < 5; i++) {
    const app = applications[i]
    const changedBy = randomFrom(users)

    await prisma.applicationStatusHistory.create({
      data: {
        applicationId: app.id,
        fromStatus: null,
        toStatus: 'New',
        changedById: changedBy.id,
        note: 'Đơn ứng tuyển mới được tạo',
        changedAt: new Date(app.createdAt.getTime() + 60000),
      },
    })

    if (app.currentStatus !== 'New') {
      await prisma.applicationStatusHistory.create({
        data: {
          applicationId: app.id,
          fromStatus: 'New',
          toStatus: app.currentStatus,
          changedById: changedBy.id,
          note: historyNotes[i],
          changedAt: new Date(app.createdAt.getTime() + 24 * 60 * 60 * 1000),
        },
      })
    }
  }

  console.log('✅ Created status history for 5 applications')

  console.log('\n🎉 Seed completed successfully!')
  console.log('\n📋 Login credentials:')
  console.log('  Admin:    admin@gapsoftware.asia    / Admin@123')
  console.log('  HR 1:     huong.tran@gapsoftware.asia / Hr@123456')
  console.log('  HR 2:     minh.le@gapsoftware.asia    / Hr@123456')
  console.log('  Viewer:   tung.pham@gapsoftware.asia  / Hr@123456')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
