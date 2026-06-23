/* ============================================================
   seed.js — populates demo data on first run only
   Real public YouTube/Drive sample links are used so embeds work.
   ============================================================ */

const Seed = {
  async run() {
    if (localStorage.getItem(DB_KEYS.seeded)) return;

    // Demo teacher + student accounts (password for both: "demo1234")
    const passwordHash = await Auth.hash('demo1234');
    const teacher = {
      id: uid('user'), name: 'Mrs. Anika Sharma', email: 'teacher@demo.com',
      role: 'Teacher', passwordHash, avatarColor: '#7c3aed',
      followers: [], following: [], saved: [], xp: 240, level: 3, createdAt: nowISO()
    };
    const student = {
      id: uid('user'), name: 'Rohan Patel', email: 'student@demo.com',
      role: 'Student', passwordHash, avatarColor: '#06b6d4',
      followers: [], following: [], saved: [], xp: 60, level: 1, createdAt: nowISO()
    };
    DB.save(DB_KEYS.users, [teacher, student]);

    const samples = [
      {
        title: 'Newton\'s Laws of Motion — Full Concept',
        description: 'Complete breakdown of all three laws with real-life examples. Perfect for board exam revision.',
        stream: 'Science', standard: '11', subject: 'Physics', topic: 'Laws of Motion',
        link: 'https://www.youtube.com/watch?v=kKKM8Y-u7ds', author: teacher.id, paid: false
      },
      {
        title: 'Organic Chemistry Notes — Hydrocarbons',
        description: 'Hand-written notes covering alkanes, alkenes and alkynes with solved examples.',
        stream: 'Science', standard: '11', subject: 'Chemistry', topic: 'Hydrocarbons',
        link: 'https://drive.google.com/file/d/1BxGz5_3jE7N0qF8rT2pYkXWv9mLh3cAa/view', author: teacher.id, paid: false
      },
      {
        title: 'Accountancy — Trial Balance Tricks',
        description: 'Shortcut methods to prepare trial balance fast for exams. Includes practice sheet.',
        stream: 'Commerce', standard: '12', subject: 'Accountancy', topic: 'Trial Balance',
        link: 'https://drive.google.com/file/d/1CxHa6_4kF8O1gR9sU3qZlYXw0nMi4dBb/view', author: teacher.id, paid: true
      },
      {
        title: 'World War II — Crash Course History',
        description: 'A quick, engaging recap of WWII causes, key events and aftermath.',
        stream: 'Arts', standard: '12', subject: 'History', topic: 'World War II',
        link: 'https://www.youtube.com/watch?v=Q78COTwT7nE', author: student.id, paid: false
      },
      {
        title: 'Business Studies — Principles of Management PPT',
        description: 'Slide deck covering Fayol\'s 14 principles with diagrams.',
        stream: 'Commerce', standard: '12', subject: 'Business Studies', topic: 'Principles of Management',
        link: 'https://docs.google.com/presentation/d/1DyIb7_5lG9P2hS0tV4rAmZYx1oNj5eCc/edit', author: teacher.id, paid: true
      },
      {
        title: 'Calculus — Limits & Continuity Explained',
        description: 'Step-by-step visual explanation of limits, continuity and differentiability.',
        stream: 'Science', standard: '12', subject: 'Mathematics', topic: 'Limits & Continuity',
        link: 'https://www.youtube.com/watch?v=WUvTyaaNkzM', author: teacher.id, paid: false
      },
      {
        title: 'Political Science — Indian Constitution Basics',
        description: 'Overview of the Preamble, Fundamental Rights and Duties.',
        stream: 'Arts', standard: '11', subject: 'Political Science', topic: 'Indian Constitution',
        link: 'https://www.youtube.com/watch?v=l8mF7CYExLg', author: student.id, paid: false
      }
    ];

    const posts = samples.map(s => {
      const meta = LinkUtils.analyze(s.link);
      return {
        id: uid('post'),
        title: s.title,
        description: s.description,
        stream: s.stream,
        standard: s.standard,
        subject: s.subject,
        topic: s.topic,
        type: meta.type,
        linkKind: meta.kind,
        linkId: meta.id || null,
        link: meta.url,
        paid: s.paid,
        price: s.paid ? (Math.floor(Math.random() * 4) + 2) * 10 : 0, // 20-50 coins
        author: s.author,
        likes: [],
        saves: [],
        createdAt: nowISO()
      };
    });
    DB.save(DB_KEYS.posts, posts);

    // Demo classroom
    const classroom = {
      id: uid('class'), name: 'Class 12 Science — Batch A', code: 'SCI12A',
      teacher: teacher.id, announcements: [
        { id: uid('ann'), text: 'Welcome! Unit test on Laws of Motion next Monday.', createdAt: nowISO() }
      ], createdAt: nowISO()
    };
    DB.save(DB_KEYS.classrooms, [classroom]);
    DB.save(DB_KEYS.classroomMembers, [
      { id: uid('mem'), classroomId: classroom.id, userId: teacher.id, roleInClass: 'Teacher' },
      { id: uid('mem'), classroomId: classroom.id, userId: student.id, roleInClass: 'Student' }
    ]);

    // Demo quiz
    const quiz = {
      id: uid('quiz'), code: 'PHY101', classroomId: classroom.id, author: teacher.id,
      title: 'Laws of Motion — Quick Quiz',
      questions: [
        { id: uid('q'), text: 'Newton\'s First Law is also called the Law of:', options: ['Inertia', 'Acceleration', 'Action-Reaction', 'Gravitation'], correct: 0 },
        { id: uid('q'), text: 'F = ma is Newton\'s ___ Law', options: ['First', 'Second', 'Third', 'Zeroth'], correct: 1 },
        { id: uid('q'), text: 'Every action has an equal and opposite reaction — this is Newton\'s:', options: ['First Law', 'Second Law', 'Third Law', 'Law of Gravitation'], correct: 2 }
      ],
      createdAt: nowISO()
    };
    DB.save(DB_KEYS.quizzes, [quiz]);

    // Demo chat message inside classroom
    DB.save(DB_KEYS.chats, [
      { id: uid('msg'), classroomId: classroom.id, userId: teacher.id, text: 'Good morning everyone! 📚', createdAt: nowISO() },
      { id: uid('msg'), classroomId: classroom.id, userId: student.id, text: 'Good morning ma\'am!', createdAt: nowISO() }
    ]);

    localStorage.setItem(DB_KEYS.seeded, 'true');
    console.log('Seed data created. Demo logins: teacher@demo.com / student@demo.com, password: demo1234');
  }
};
