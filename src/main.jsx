import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  Cpu,
  Download,
  Eye,
  FileCode,
  FileQuestion,
  Home,
  Info as InfoIcon,
  LayoutDashboard,
  Lock,
  LogIn,
  LogOut,
  Plus,
  Printer,
  Rocket,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Trophy,
  Upload,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import './styles.css';

const columnAliases = {
  direction: ['direction', 'yonalish', "yo'nalish", 'kurs', 'fan'],
  topic: ['topic', 'mavzu', 'dars'],
  section: ['section', 'qism', 'tur', 'type'],
  question: ['question', 'savol', 'savol matni', 'topshiriq'],
  answers: ['answers', 'variantlar', 'javob variantlari'],
  correct: ['correct', 'togri', "to'g'ri", 'correct index', 'javob'],
  points: ['points', 'ball', 'score'],
  code: ['code', 'starter_code', 'boshlangich kod', "boshlang'ich kod"],
  checkWords: ['check_words', 'kalit sozlar', "kalit so'zlar", 'tekshiruv'],
};

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function cell(row, key) {
  const aliases = columnAliases[key];
  const found = Object.keys(row).find((name) => aliases.includes(normalize(name)));
  return found ? row[found] : '';
}

function splitList(value) {
  return String(value || '')
    .split(/[\n;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}

function normalizeSection(value, answers) {
  const text = normalize(value);
  if (text.includes('amaliy') || text.includes('practice') || text.includes('kod')) return 'practice';
  if (text.includes('yakun') || text.includes('exam')) return 'exam';
  if (text.includes('nazari') || text.includes('theory')) return 'theory';
  if (text.includes('test') || answers.length) return 'test';
  return 'test';
}

function parseCorrectAnswer(value, answers) {
  const raw = String(value || '').trim();
  const asNumber = Number(raw);
  if (Number.isInteger(asNumber) && asNumber > 0) return Math.min(answers.length - 1, asNumber - 1);

  const letter = raw.toUpperCase();
  if (/^[A-Z]$/.test(letter)) {
    const index = letter.charCodeAt(0) - 65;
    if (index >= 0 && index < answers.length) return index;
  }

  const byText = answers.findIndex((answer) => normalize(answer) === normalize(raw));
  return byText >= 0 ? byText : 0;
}

function mapExcelQuestion(row) {
  const question = String(cell(row, 'question')).trim();
  if (!question) return null;
  const answers = splitList(cell(row, 'answers'));
  const section = normalizeSection(cell(row, 'section'), answers);

  return {
    id: createId(),
    direction: String(cell(row, 'direction') || 'Python Dasturlash').trim(),
    topic: String(cell(row, 'topic') || 'Variables (O\'zgaruvchilar)').trim(),
    section,
    question,
    answers,
    correct: parseCorrectAnswer(cell(row, 'correct'), answers),
    code: String(cell(row, 'code') || '# Kodi shu yerga yozing').trim(),
    checkWords: splitList(cell(row, 'checkWords')),
    points: Number(cell(row, 'points')) || 4,
  };
}

const directions = [
  { title: 'Python Dasturlash', icon: Code2, progress: 0, open: true, color: '#27a8ff' },
  { title: 'Arduino', icon: Cpu, progress: 0, open: false, color: '#14b8a6' },
  { title: 'Web Dasturlash', icon: Lock, progress: 0, open: false, color: '#8b9bb2' },
  { title: 'App Inventor', icon: Bot, progress: 0, open: false, color: '#94a3b8' },
  { title: 'Onshape', icon: Settings, progress: 0, open: false, color: '#22c55e' },
  { title: 'ESP32', icon: Cpu, progress: 0, open: false, color: '#64748b' },
  { title: 'IoT (Blynk)', icon: ShieldCheck, progress: 0, open: false, color: '#64748b' },
];

const initialDirectionAccess = Object.fromEntries(directions.map((item, index) => [item.title, index === 0]));
const initialLessonAccess = Object.fromEntries(directions.map((item) => [item.title, 1]));

const lessons = [
  'Variables (O\'zgaruvchilar)',
  'Data Types',
  'Operators',
  'Input / Output',
  'If / Else',
  'Loops',
  'Functions',
];

const initialDirectionLessons = Object.fromEntries(directions.map((item) => [item.title, lessons]));

const initialLessonContents = {
  'Variables (O\'zgaruvchilar)': {
    title: "O'zgaruvchi nima?",
    text: "O'zgaruvchi dasturda qiymat saqlash uchun nomlangan joydir. Python'da o'zgaruvchi nomi yozilib, unga qiymat beriladi.",
    videoUrl: '',
  },
};

const starterQuestions = [
  {
    id: 'q1',
    direction: 'Python Dasturlash',
    topic: 'Variables (O\'zgaruvchilar)',
    section: 'test',
    question: 'Python izoh (comment) qanday yoziladi?',
    answers: ['// izoh', '# izoh', '/* izoh */', '<!-- izoh -->'],
    correct: 1,
    points: 4,
  },
  {
    id: 'q2',
    direction: 'Python Dasturlash',
    topic: 'Variables (O\'zgaruvchilar)',
    section: 'practice',
    question: 'name va age o\'zgaruvchilarini yarating va ularni ekranga chiqaring.',
    code: '# Kodi shu yerga yozing\nname = "Ali"\nage = 15\nprint(name)\nprint(age)',
    checkWords: ['name', 'age', 'print'],
    points: 8,
  },
  {
    id: 'q3',
    direction: 'Python Dasturlash',
    topic: 'Variables (O\'zgaruvchilar)',
    section: 'exam',
    question: 'O\'zgaruvchi yaratish uchun qaysi yozuv to\'g\'ri?',
    answers: ['let name = Ali', 'name = "Ali"', 'var name: Ali', 'create name Ali'],
    correct: 1,
    points: 4,
  },
];

const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'directions', label: "Yo'nalishlar", icon: BookOpen },
  { id: 'courses', label: 'Mening o\'quvlarim', icon: Award },
  { id: 'exam', label: 'Imtihonlar', icon: FileQuestion },
  { id: 'certificate', label: 'Sertifikatlar', icon: Trophy },
  { id: 'notifications', label: 'Xabarnomalar', icon: Bell },
  { id: 'profile', label: 'Profil', icon: User },
];

const adminNav = [
  {
    title: 'Umumiy',
    items: [
      { id: 'admin', label: 'Boshqaruv paneli', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Kontent',
    items: [
      { id: 'admin-directions', label: "Yo'nalish qo'shish", icon: Rocket },
      { id: 'admin-topic', label: 'Mavzu qo\'shish', icon: Plus },
      { id: 'admin-lesson', label: 'Dars qo\'shish', icon: BookOpen },
      { id: 'admin-questions', label: 'Test va nazoratlar', icon: FileQuestion },
    ],
  },
  {
    title: "O'quvchi",
    items: [
      { id: 'admin-access', label: 'Ruxsatlar', icon: ShieldCheck },
    ],
  },
  {
    title: "Ko'rish",
    items: [
      { id: 'dashboard', label: 'Foydalanuvchi paneli', icon: Users },
    ],
  },
];

function clampLessonCount(value, courseLessons) {
  if (!courseLessons.length) return 0;
  return Math.max(1, Math.min(courseLessons.length, Number(value) || 1));
}

function getUnlockedLessonCount(lessonAccess, direction, courseLessons) {
  return clampLessonCount(lessonAccess[direction] || 1, courseLessons);
}

function getNextDirection(directionList, title) {
  const list = directionList?.length ? directionList : directions;
  const index = list.findIndex((item) => item.title === title);
  return list[index + 1]?.title || null;
}

function App() {
  const [screen, setScreen] = useState('home');
  const [role, setRole] = useState('student');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedDirection, setSelectedDirection] = useState('Python Dasturlash');
  const [selectedLesson, setSelectedLesson] = useState(0);
  const [managedDirections, setManagedDirections] = useState(directions);
  const [directionLessons, setDirectionLessons] = useState(initialDirectionLessons);
  const [lessonContents, setLessonContents] = useState(initialLessonContents);
  const [questions, setQuestions] = useState(() => {
    const stored = readStored('attestatsiya.questions', []);
    const storedIds = new Set(stored.map((item) => item.id));
    return [...starterQuestions.filter((item) => !storedIds.has(item.id)), ...stored];
  });
  const [result, setResult] = useState(null);
  const [directionAccess, setDirectionAccess] = useState(initialDirectionAccess);
  const [lessonAccess, setLessonAccess] = useState(initialLessonAccess);
  const [completedDirections, setCompletedDirections] = useState([]);
  const courseLessons = directionLessons[selectedDirection] || [];

  useEffect(() => {
    writeStored('attestatsiya.questions', questions);
  }, [questions]);

  function updateCourseLessons(direction, updater) {
    setDirectionLessons((current) => {
      const currentLessons = current[direction] || [];
      const nextLessons = typeof updater === 'function' ? updater(currentLessons) : updater;
      return { ...current, [direction]: nextLessons };
    });
  }

  function setCourseLessons(updater) {
    updateCourseLessons(selectedDirection, updater);
  }

  function openDirection(title) {
    if (!title) return;
    setDirectionAccess((current) => ({ ...current, [title]: true }));
    setLessonAccess((current) => ({ ...current, [title]: current[title] || 1 }));
  }

  function completeDirection(title) {
    setCompletedDirections((current) => (current.includes(title) ? current : [...current, title]));
    openDirection(getNextDirection(managedDirections, title));
  }

  function logout() {
    setRole('student');
    setIsAuthenticated(false);
    setResult(null);
    setScreen('login');
  }

  const page = useMemo(() => {
    const props = { setScreen, selectedDirection, setSelectedDirection, selectedLesson, setSelectedLesson, courseLessons, setCourseLessons, directionLessons, setDirectionLessons, updateCourseLessons, lessonContents, setLessonContents, questions, setQuestions, result, setResult, directionAccess, setDirectionAccess, lessonAccess, setLessonAccess, completedDirections, completeDirection, directions: managedDirections, setDirections: setManagedDirections };
    if (screen === 'home') return <HomePage setScreen={setScreen} />;
    if (screen === 'register') return <RegisterPage setScreen={setScreen} setIsAuthenticated={setIsAuthenticated} />;
    if (screen === 'login') return <LoginPage setScreen={setScreen} setRole={setRole} setIsAuthenticated={setIsAuthenticated} />;
    if (!isAuthenticated) return <LoginPage setScreen={setScreen} setRole={setRole} setIsAuthenticated={setIsAuthenticated} />;
    if (screen === 'dashboard') return <DashboardPage {...props} />;
    if (screen === 'directions') return <DirectionsPage {...props} />;
    if (screen === 'courses') return <CoursesPage {...props} />;
    if (screen === 'course') return <CoursePage {...props} />;
    if (screen === 'theory') return <TheoryPage {...props} />;
    if (screen === 'practice') return <PracticePage {...props} />;
    if (screen === 'test') return <TestPage {...props} />;
    if (screen === 'final') return <FinalTaskPage {...props} />;
    if (screen === 'exam') return <ExamPage {...props} />;
    if (screen === 'result') return <ResultPage {...props} />;
    if (screen === 'certificate') return <CertificatePage selectedDirection={selectedDirection} result={result} />;
    if (screen === 'profile') return <ProfilePage />;
    if (screen === 'notifications') return <NotificationsPage />;
    if (screen === 'admin') return <AdminDashboard questions={questions} directionAccess={directionAccess} lessonAccess={lessonAccess} directionLessons={directionLessons} completedDirections={completedDirections} directions={managedDirections} setScreen={setScreen} />;
    if (screen === 'admin-directions') return <AdminDirections directions={managedDirections} setDirections={setManagedDirections} setDirectionAccess={setDirectionAccess} setLessonAccess={setLessonAccess} setDirectionLessons={setDirectionLessons} setSelectedDirection={setSelectedDirection} />;
    if (screen === 'admin-questions') return <AdminQuestions questions={questions} setQuestions={setQuestions} directions={managedDirections} directionLessons={directionLessons} />;
    if (screen === 'admin-access') return <AdminAccess directionAccess={directionAccess} setDirectionAccess={setDirectionAccess} lessonAccess={lessonAccess} setLessonAccess={setLessonAccess} directionLessons={directionLessons} completedDirections={completedDirections} directions={managedDirections} />;
    if (screen === 'admin-topic') return <AdminTopic {...props} />;
    if (screen === 'admin-lesson') return <AdminLesson {...props} />;
    return <DashboardPage {...props} />;
  }, [completedDirections, courseLessons, directionAccess, directionLessons, isAuthenticated, lessonAccess, lessonContents, managedDirections, questions, result, screen, selectedDirection, selectedLesson]);

  if (['home', 'register', 'login'].includes(screen) || !isAuthenticated) return page;

  return (
    <div className="shell">
      <Sidebar role={role} screen={screen} setScreen={setScreen} onLogout={logout} />
      <main className="main">
        <Topbar role={role} setRole={setRole} setScreen={setScreen} />
        {page}
      </main>
    </div>
  );
}

function Brand() {
  return <button type="button" className="brand"><ShieldCheck size={22} /><b>Attestatsiya</b></button>;
}

function HomePage({ setScreen }) {
  return (
    <div className="public hero-screen">
      <header className="public-nav">
        <Brand />
        <button className="primary small" onClick={() => setScreen('login')}><LogIn size={16} /> Kirish</button>
      </header>
      <section className="hero">
        <div>
          <h1>Kelajagingizni biz bilan yarating</h1>
          <p>Dasturlash, robototexnika va zamonaviy texnologiyalar bo'yicha attestatsiyadan o'ting va sertifikatlarga ega bo'ling.</p>
          <div className="actions">
            <button className="primary" onClick={() => setScreen('register')}><Rocket size={18} /> Boshlash</button>
            <button className="ghost" onClick={() => setScreen('login')}><InfoIcon size={18} /> Ko'proq ma'lumot</button>
          </div>
        </div>
        <StudentVisual variant="front" />
      </section>
      <div className="feature-strip">
        <Info icon={Award} title="Sifatli darslar" text="Rejalashtirilgan nazariya va amaliyot" />
        <Info icon={Rocket} title="Amaliy loyihalar" text="Real topshiriqlar bilan mashq qiling" />
        <Info icon={FileQuestion} title="Test va imtihonlar" text="Natijani darhol ko'ring" />
        <Info icon={Trophy} title="Sertifikat" text="Muvaffaqiyatdan keyin yuklab oling" />
      </div>
    </div>
  );
}

function RegisterPage({ setScreen, setIsAuthenticated }) {
  return (
    <div className="public auth-split">
      <form className="auth-card">
        <Brand />
        <h2>Ro'yxatdan o'tish</h2>
        <label>Ism<input placeholder="Ismingiz" /></label>
        <label>Email<input placeholder="Email" /></label>
        <label>Parol<input type="password" placeholder="Parol" /></label>
        <label>Parolni tasdiqlang<input type="password" placeholder="Qayta kiriting" /></label>
        <label className="check"><input type="checkbox" defaultChecked /> Men foydalanish shartlari bilan roziman</label>
        <button type="button" className="primary wide" onClick={() => { setIsAuthenticated?.(true); setScreen('dashboard'); }}><UserPlus size={18} /> Ro'yxatdan o'tish</button>
        <p>Hisobingiz bormi? <button type="button" className="link" onClick={() => setScreen('login')}><LogIn size={15} /> Kirish</button></p>
      </form>
      <StudentVisual variant="front" compact />
    </div>
  );
}

function LoginPage({ setScreen, setRole, setIsAuthenticated }) {
  return (
    <div className="public auth-split">
      <form className="auth-card">
        <Brand />
        <h2>Tizimga kirish</h2>
        <label>Email<input defaultValue="example@gmail.com" /></label>
        <label>Parol<input type="password" defaultValue="123456" /></label>
        <button type="button" className="primary wide" onClick={() => { setRole('student'); setIsAuthenticated(true); setScreen('dashboard'); }}><LogIn size={18} /> Kirish</button>
        <button type="button" className="ghost wide" onClick={() => { setRole('admin'); setIsAuthenticated(true); setScreen('admin'); }}><ShieldCheck size={18} /> Admin sifatida kirish</button>
        <p>Hisobingiz yo'qmi? <button type="button" className="link" onClick={() => setScreen('register')}><UserPlus size={15} /> Ro'yxatdan o'tish</button></p>
      </form>
      <StudentVisual variant="side" compact />
    </div>
  );
}

function Sidebar({ role, screen, setScreen, onLogout }) {
  const groups = role === 'admin' ? adminNav : [{ title: '', items: nav }];
  return (
    <aside className="sidebar">
      <Brand />
      <nav>
        {groups.map((group) => (
          <div className="nav-group" key={group.title || 'main'}>
            {group.title && <span>{group.title}</span>}
            {group.items.map((item) => {
              const Icon = item.icon;
              return <button type="button" key={item.id} className={screen === item.id ? 'active' : ''} onClick={() => setScreen(item.id)}><Icon size={17} /> {item.label}</button>;
            })}
          </div>
        ))}
      </nav>
      <button type="button" className="logout" onClick={onLogout}><LogOut size={17} /> Chiqish</button>
    </aside>
  );
}

function Topbar({ role, setRole, setScreen }) {
  return (
    <header className="topbar">
      <div><b>{role === 'admin' ? 'Admin panel' : 'Salom, Sardor!'}</b><span>O'qishni boshlashga tayyor.</span></div>
      <div className="top-actions">
        <Search size={18} />
        <button type="button" className="icon-btn" onClick={() => setScreen('notifications')}><Bell size={17} /></button>
        <button className="avatar" onClick={() => { const next = role === 'admin' ? 'student' : 'admin'; setRole(next); setScreen(next === 'admin' ? 'admin' : 'dashboard'); }}>S</button>
      </div>
    </header>
  );
}

function DashboardPage({ setScreen, setSelectedDirection, directionAccess, lessonAccess, directionLessons, completedDirections, directions }) {
  const openCount = directions.filter((item) => directionAccess[item.title]).length;
  const unlockedLessons = directions.reduce((total, item) => total + (directionAccess[item.title] ? getUnlockedLessonCount(lessonAccess, item.title, directionLessons[item.title] || []) : 0), 0);
  return (
    <section className="panel">
      <div className="dashboard-head">
        <div><h2>Umumiy progress</h2><div className="progress"><i style={{ width: '0%' }} /></div></div>
        <Stat value={openCount} label="Ochiq yo'nalishlar" />
        <Stat value={unlockedLessons} label="Ochiq mavzular" />
        <Stat value={completedDirections.length} label="Tugallangan yo'nalishlar" />
      </div>
      <Title title="Yo'nalishlar" action={<button className="ghost small" onClick={() => setScreen('directions')}><Eye size={15} /> Barchasini ko'rish</button>} />
      <DirectionGrid directions={directions} directionAccess={directionAccess} onOpen={(title) => { setSelectedDirection(title); setScreen('course'); }} />
    </section>
  );
}

function DirectionsPage({ setScreen, setSelectedDirection, directionAccess, directions }) {
  return (
    <section className="panel">
      <Title title="Yo'nalishlar" subtitle="O'zingizga qiziq yo'nalishni tanlang va o'qishni boshlang." />
      <DirectionGrid large directions={directions} directionAccess={directionAccess} onOpen={(title) => { setSelectedDirection(title); setScreen('course'); }} />
    </section>
  );
}

function CoursesPage({ setScreen, setSelectedDirection, directionAccess, lessonAccess, directionLessons, directions }) {
  return (
    <section className="panel">
      <Title title="Mening o'quvlarim" subtitle="Kurslar hali boshlanmagan. Birinchi darsdan boshlashingiz mumkin." />
      <div className="course-list">
        {directions.map((item) => {
          const Icon = item.icon;
          const open = Boolean(directionAccess[item.title]);
          const list = directionLessons[item.title] || [];
          const unlocked = getUnlockedLessonCount(lessonAccess, item.title, list);
          return (
            <article key={item.title}>
              <Icon size={30} />
              <div>
                <h3>{item.title}</h3>
                <p>{open ? `Ochiq mavzu: ${unlocked}. ${list[unlocked - 1] || 'Mavzu kiritilmagan'}` : 'Oldingi yo\'nalish tugagach yoki admin ochgach ishlaydi'}</p>
                <div className="progress"><i style={{ width: '0%' }} /></div>
              </div>
              <button className={open ? 'primary small' : 'ghost small'} disabled={!open} onClick={() => { setSelectedDirection(item.title); setScreen('course'); }}><BookOpen size={15} /> {open ? 'Boshlash' : 'Yopiq'}</button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DirectionGrid({ onOpen, large, directionAccess, directions }) {
  return (
    <div className={`direction-grid ${large ? 'large' : ''}`}>
      {directions.map((item) => {
        const Icon = item.icon;
        const isOpen = Boolean(directionAccess[item.title]);
        return (
          <button className="direction-card" key={item.title} disabled={!isOpen} aria-disabled={!isOpen} onClick={() => isOpen && onOpen(item.title)}>
            <Icon size={42} style={{ color: item.color }} />
            {!isOpen && <Lock className="lock" size={22} />}
            <b>{item.title}</b>
            <small>{isOpen ? 'Ochiq' : 'Qulflangan'}</small>
            <span className="progress"><i style={{ width: `${item.progress}%`, background: item.color }} /></span>
            <em>{item.progress}%</em>
          </button>
        );
      })}
    </div>
  );
}

function CoursePage({ selectedDirection, selectedLesson, setSelectedLesson, setScreen, courseLessons, directionAccess, lessonAccess }) {
  const isDirectionOpen = Boolean(directionAccess[selectedDirection]);
  const unlockedLessonCount = getUnlockedLessonCount(lessonAccess, selectedDirection, courseLessons);
  const isLessonOpen = selectedLesson < unlockedLessonCount;

  useEffect(() => {
    if (unlockedLessonCount > 0 && selectedLesson >= unlockedLessonCount) setSelectedLesson(unlockedLessonCount - 1);
  }, [selectedLesson, setSelectedLesson, unlockedLessonCount]);

  if (!isDirectionOpen) {
    return (
      <section className="panel">
        <Title title={selectedDirection} subtitle="Bu yo'nalish hozircha yopiq. Oldingi yo'nalishni yakunlang yoki admin ruxsat bersin." />
      </section>
    );
  }

  return (
    <section className="panel course-view">
      <div className="course-side">
        <h2>{selectedDirection}</h2>
        <div className="progress"><i style={{ width: '0%' }} /></div>
        {courseLessons.map((lesson, index) => (
          <button key={lesson} disabled={index >= unlockedLessonCount} className={selectedLesson === index ? 'active' : ''} onClick={() => setSelectedLesson(index)}>
            {index + 1}. {lesson} {index >= unlockedLessonCount ? ' - yopiq' : ''}
          </button>
        ))}
      </div>
      <div className="lesson-preview">
        <h3>{courseLessons[selectedLesson] ? `${selectedLesson + 1}. ${courseLessons[selectedLesson]}` : 'Mavzu kiritilmagan'}</h3>
        <p>{isLessonOpen ? 'Bu mavzuda nazariya, amaliy topshiriq, test va yakuniy topshiriq bosqichma-bosqich bajariladi.' : 'Bu mavzu hozircha yopiq. Admin ochib berishi mumkin.'}</p>
        <ul><li>Nazariy qism</li><li>Amaliyot</li><li>Test</li><li>Yakuniy topshiriq</li></ul>
        <button className="primary" disabled={!isLessonOpen} onClick={() => setScreen('theory')}><ArrowRight size={18} /> Boshlash</button>
      </div>
    </section>
  );
}

function StageTabs({ active, setScreen }) {
  const tabs = [['theory', 'Nazariya'], ['practice', 'Amaliyot'], ['test', 'Test'], ['final', 'Yakuniy topshiriq']];
  return <div className="stage-tabs">{tabs.map(([id, label]) => <button key={id} className={active === id ? 'active' : ''} onClick={() => setScreen(id)}>{label}</button>)}</div>;
}

function TheoryPage({ setScreen, selectedDirection, selectedLesson, courseLessons, lessonContents }) {
  const lesson = courseLessons[selectedLesson] || courseLessons[0];
  const content = getLessonContent(lessonContents, selectedDirection, lesson) || {
    title: lesson,
    text: 'Bu mavzu uchun nazariy dars hali kiritilmagan. Admin panel orqali dars matni qo\'shing.',
    videoUrl: '',
  };

  return (
    <section className="panel lesson-page">
      <h2>{selectedLesson + 1}. {lesson}</h2>
      <p>1-qism: Nazariy qism</p>
      <StageTabs active="theory" setScreen={setScreen} />
      <div className="media-layout">
        <div className="video-card"><Code2 size={72} /><strong>{lesson}</strong><span>{content.videoUrl ? 'Video havola kiritilgan' : 'Video dars'}</span></div>
        <article>
          <h3>{content.title}</h3>
          <p>{content.text}</p>
          {content.videoUrl && <p><a href={content.videoUrl} target="_blank" rel="noreferrer">Video darsni ochish</a></p>}
          <pre>{'name = "Ali"\nage = 15\nprint(name)\nprint(age)'}</pre>
          <button className="primary" onClick={() => setScreen('practice')}><ArrowRight size={18} /> Keyingi: Amaliyot</button>
        </article>
      </div>
    </section>
  );
}

function getCurrentLesson(courseLessons, selectedLesson) {
  return courseLessons[selectedLesson] || courseLessons[0] || '';
}

function matches(value, expected) {
  return normalize(value) === normalize(expected);
}

function getQuestions(questions, selectedDirection, lesson, section) {
  const isStarter = (item) => starterQuestions.some((starter) => starter.id === item.id);
  const customFirst = (items) => [...items].sort((a, b) => Number(isStarter(a)) - Number(isStarter(b)));
  const exact = customFirst(questions.filter((item) => matches(item.direction, selectedDirection) && matches(item.topic, lesson) && item.section === section));
  const customExact = exact.filter((item) => !isStarter(item));
  if (customExact.length) return exact;

  const byDirection = customFirst(questions.filter((item) => matches(item.direction, selectedDirection) && item.section === section));
  const customByDirection = byDirection.filter((item) => !isStarter(item));
  if (customByDirection.length) return byDirection;

  if (exact.length) return exact;

  return starterQuestions.filter((item) => item.section === section);
}

function PracticePage({ setScreen, questions, selectedDirection, selectedLesson, courseLessons, setResult }) {
  const lesson = getCurrentLesson(courseLessons, selectedLesson);
  const tasks = getQuestions(questions, selectedDirection, lesson, 'practice');
  const [taskIndex, setTaskIndex] = useState(0);
  const task = tasks[taskIndex] || starterQuestions[1];
  const [code, setCode] = useState(task.code || '');
  const [message, setMessage] = useState('');
  const [solved, setSolved] = useState({});

  useEffect(() => {
    setTaskIndex(0);
    setSolved({});
  }, [lesson, selectedDirection, tasks.length]);

  useEffect(() => {
    setCode(task.code || '');
    setMessage('');
  }, [task.id, taskIndex]);

  function check() {
    const normalized = code.toLowerCase();
    const checkWords = task.checkWords?.length ? task.checkWords : [];
    const ok = checkWords.length
      ? checkWords.every((word) => normalized.includes(word.toLowerCase()))
      : code.trim().length > 0 && code !== (task.code || '');
    const nextSolved = { ...solved, [task.id]: ok };
    const correct = Object.values(nextSolved).filter(Boolean).length;
    const total = Math.max(tasks.length, 1);
    setMessage(ok ? 'Yechim qabul qilindi.' : 'Yechimda kerakli qismlar yetishmayapti.');
    setSolved(nextSolved);
    setResult({ percent: Math.round((correct / total) * 100), correct, wrong: total - correct, score: Math.round((correct / total) * 100) });
  }

  async function uploadCode(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCode(await file.text());
    setMessage(`${file.name} fayli yuklandi. Endi yechimni tekshirishingiz mumkin.`);
    event.target.value = '';
  }

  return (
    <section className="panel lesson-page">
      <h2>{selectedLesson + 1}. {lesson}</h2>
      <p>2-qism: Amaliyot</p>
      <StageTabs active="practice" setScreen={setScreen} />
      <div className="practice-grid">
        <div>
          <h3>{taskIndex + 1}-topshiriq / {tasks.length}</h3>
          <small>{task.direction} / {task.topic}</small>
          <p>{task.question}</p>
        </div>
        <textarea className="code-editor" value={code} onChange={(event) => setCode(event.target.value)} />
      </div>
      {message && <div className="notice"><CheckCircle2 size={18} /> {message}</div>}
      <div className="actions end">
        <button className="ghost" disabled={taskIndex === 0} onClick={() => setTaskIndex((index) => index - 1)}><ArrowRight className="flip-icon" size={18} /> Oldingi</button>
        <button className="ghost" disabled={taskIndex >= tasks.length - 1} onClick={() => setTaskIndex((index) => index + 1)}><ArrowRight size={18} /> Keyingi topshiriq</button>
        <label className="file-button ghost"><FileCode size={18} /> Fayl yuklash (.py)<input type="file" accept=".py,.txt" onChange={uploadCode} /></label>
        <button className="primary" onClick={check}><ClipboardCheck size={18} /> Yechimni tekshirish</button>
      </div>
    </section>
  );
}

function getChoiceQuestions(questions, selectedDirection, lesson, section = 'test') {
  const choices = getQuestions(questions, selectedDirection, lesson, section).filter((item) => item.answers?.length);
  if (choices.length) return choices;
  return starterQuestions.filter((item) => item.section === section && item.answers?.length).slice(0, 1);
}

function TestPage({ setScreen, questions, selectedDirection, selectedLesson, courseLessons, setResult }) {
  const lesson = getCurrentLesson(courseLessons, selectedLesson);
  const testQuestions = getChoiceQuestions(questions, selectedDirection, lesson);
  const [questionIndex, setQuestionIndex] = useState(0);
  const question = testQuestions[questionIndex] || starterQuestions[0];
  const [answer, setAnswer] = useState(null);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    setQuestionIndex(0);
    setAnswers({});
  }, [lesson, selectedDirection, testQuestions.length]);

  useEffect(() => {
    setAnswer(answers[question.id] ?? null);
  }, [answers, question.id, questionIndex]);

  function next() {
    const nextAnswers = { ...answers, [question.id]: answer };
    setAnswers(nextAnswers);
    if (questionIndex < testQuestions.length - 1) {
      setQuestionIndex((index) => index + 1);
      return;
    }

    const correct = testQuestions.filter((item) => nextAnswers[item.id] === item.correct).length;
    const total = Math.max(testQuestions.length, 1);
    const score = Math.round((correct / total) * 100);
    setResult({ percent: score, correct, wrong: total - correct, score });
    setScreen('final');
  }

  return (
    <section className="panel lesson-page">
      <h2>{selectedLesson + 1}. {lesson}</h2>
      <p>3-qism: Test</p>
      <StageTabs active="test" setScreen={setScreen} />
      <div className="quiz-head"><b>Test savollari</b><span>{questionIndex + 1} / {testQuestions.length}</span></div>
      <h3>{question.question}</h3>
      <div className="answers">
        {question.answers.map((item, index) => <button key={item} className={answer === index ? 'selected' : ''} onClick={() => setAnswer(index)}>{String.fromCharCode(65 + index)}) {item}</button>)}
      </div>
      <button className="primary" disabled={answer === null} onClick={next}><ArrowRight size={18} /> {questionIndex < testQuestions.length - 1 ? 'Keyingi savol' : 'Yakunlash'}</button>
    </section>
  );
}

function FinalTaskPage({ setScreen, selectedLesson, courseLessons, setResult }) {
  const lesson = getCurrentLesson(courseLessons, selectedLesson);
  const [code, setCode] = useState('# Kodi shu yerga yozing\nism = input("Ism: ")\nyosh = input("Yosh: ")\nprint(ism, yosh)');
  const [message, setMessage] = useState('');

  function submit() {
    const normalized = code.toLowerCase();
    const ok = ['input', 'print'].every((word) => normalized.includes(word));
    setMessage(ok ? 'Yakuniy topshiriq qabul qilindi.' : 'Topshiriqda input va print ishlatilishi kerak.');
    setResult({ percent: ok ? 90 : 50, correct: ok ? 23 : 12, wrong: ok ? 2 : 13, score: ok ? 90 : 50 });
    if (ok) setScreen('exam');
  }

  return (
    <section className="panel lesson-page">
      <h2>{selectedLesson + 1}. {lesson}</h2>
      <p>4-qism: Yakuniy topshiriq</p>
      <StageTabs active="final" setScreen={setScreen} />
      <div className="practice-grid">
        <div><h3>Loyiha topshirig'i</h3><p>Oddiy kontakt daftar dasturini yozing. Foydalanuvchidan ism va yosh so'rang, keyin natijani chiroyli ko'rinishda chiqaring.</p></div>
        <textarea className="code-editor" value={code} onChange={(event) => setCode(event.target.value)} />
      </div>
      {message && <div className="notice"><CheckCircle2 size={18} /> {message}</div>}
      <button className="primary" onClick={submit}><ClipboardCheck size={18} /> Topshirish</button>
    </section>
  );
}

function ExamPage({ setScreen, questions, selectedDirection, selectedLesson, courseLessons, setResult, completeDirection }) {
  const lesson = getCurrentLesson(courseLessons, selectedLesson);
  const examQuestions = getChoiceQuestions(questions, selectedDirection, lesson, 'exam');
  const [questionIndex, setQuestionIndex] = useState(0);
  const question = examQuestions[questionIndex] || starterQuestions[2];
  const [answer, setAnswer] = useState(null);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    setQuestionIndex(0);
    setAnswers({});
  }, [lesson, selectedDirection, examQuestions.length]);

  useEffect(() => {
    setAnswer(answers[question.id] ?? null);
  }, [answers, question.id, questionIndex]);

  function next() {
    const nextAnswers = { ...answers, [question.id]: answer };
    setAnswers(nextAnswers);
    if (questionIndex < examQuestions.length - 1) {
      setQuestionIndex((index) => index + 1);
      return;
    }

    const correct = examQuestions.filter((item) => nextAnswers[item.id] === item.correct).length;
    const total = Math.max(examQuestions.length, 1);
    const score = Math.round((correct / total) * 100);
    const passed = score >= 70;
    if (passed) completeDirection(selectedDirection);
    setResult({ percent: score, correct, wrong: total - correct, score, passed });
    setScreen('result');
  }

  return (
    <section className="panel exam-page">
      <div className="quiz-head"><h2>{selectedDirection}</h2><span>{questionIndex + 1} / {examQuestions.length}</span></div>
      <h3>Yakuniy imtihon</h3>
      <p>{question.question}</p>
      <div className="answers">
        {question.answers.map((item, index) => <button key={item} className={answer === index ? 'selected' : ''} onClick={() => setAnswer(index)}>{String.fromCharCode(65 + index)}) {item}</button>)}
      </div>
      <button className="primary" disabled={answer === null} onClick={next}><ArrowRight size={18} /> {questionIndex < examQuestions.length - 1 ? 'Keyingi savol' : 'Yakunlash'}</button>
    </section>
  );
}

function ResultPage({ setScreen, selectedDirection, result }) {
  if (!result) {
    return (
      <section className="panel result-page">
        <h2>Natija hali mavjud emas</h2>
        <p>{selectedDirection} bo'yicha imtihon yakunlanmagan.</p>
        <button className="ghost" onClick={() => setScreen('dashboard')}><Home size={18} /> Dashboardga qaytish</button>
      </section>
    );
  }

  const data = result;
  return (
    <section className="panel result-page">
      <h2>{data.passed ? 'Tabriklaymiz!' : 'Natija tayyor'}</h2>
      <p>{data.passed ? `Siz ${selectedDirection} yo'nalishini muvaffaqiyatli yakunladingiz.` : `${selectedDirection} bo'yicha natijangiz saqlandi.`}</p>
      <div className="result-box">
        <strong>{data.percent}%</strong>
        <span>Sizning natijangiz</span>
        <div><b>{data.correct}</b><small>To'g'ri javoblar</small></div>
        <div><b>{data.wrong}</b><small>Noto'g'ri javoblar</small></div>
        <div><b>{data.score}/100</b><small>Ball</small></div>
      </div>
      <div className="actions">
        {data.passed && <button className="success-btn" onClick={() => setScreen('certificate')}><Trophy size={18} /> Sertifikatni ko'rish</button>}
        <button className="ghost" onClick={() => setScreen('dashboard')}><Home size={18} /> Dashboardga qaytish</button>
      </div>
    </section>
  );
}

function downloadCertificate(direction) {
  const html = `<!doctype html><html><head><meta charset="UTF-8"><title>Sertifikat</title><style>body{font-family:Arial,sans-serif;padding:48px;text-align:center;color:#132341}.certificate{border:8px double #d7b45c;min-height:420px;padding:60px}h1{font-size:42px}h2{font-size:34px;color:#0f2f65}.seal{width:74px;height:74px;margin:30px auto 0;display:grid;place-items:center;border:2px solid #1f4f91;border-radius:50%;font-weight:900}</style></head><body><section class="certificate"><h1>SERTIFIKAT</h1><p>Ushbu sertifikat</p><h2>Sardor Karimov</h2><p>${direction} yo'nalishini muvaffaqiyatli yakunlagani uchun berildi.</p><div class="seal">360</div></section></body></html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sertifikat.html';
  link.click();
  URL.revokeObjectURL(url);
}

function CertificatePage({ selectedDirection, result }) {
  if (!result?.passed) {
    return (
      <section className="panel">
        <Title title="Sertifikatlar" subtitle="Hali yakunlangan kurs va berilgan sertifikat yo'q." />
      </section>
    );
  }

  return (
    <section className="certificate-wrap">
      <div className="certificate">
        <h1>SERTIFIKAT</h1>
        <p>Ushbu sertifikat</p>
        <h2>Sardor Karimov</h2>
        <p>{selectedDirection} yo'nalishini muvaffaqiyatli yakunlagani uchun berildi.</p>
        <div className="seal">360</div>
      </div>
      <div className="actions certificate-actions">
        <button className="success-btn" onClick={() => downloadCertificate(selectedDirection)}><Download size={17} /> Yuklab olish</button>
        <button className="ghost" onClick={() => window.print()}><Printer size={17} /> Chop etish</button>
      </div>
    </section>
  );
}

function ProfilePage() {
  return (
    <section className="panel profile-grid">
      <div className="big-avatar">S</div>
      <div><h2>Sardor Karimov</h2><p>em.sardor@gmail.com</p><p>O'quvchi</p></div>
      <dl><dt>To'liq ism</dt><dd>Sardor Karimov</dd><dt>Telefon</dt><dd>+998 90 123 45 67</dd><dt>Tug'ilgan sana</dt><dd>15.01.2004</dd></dl>
    </section>
  );
}

function NotificationsPage() {
  return (
    <section className="panel">
      <Title title="Xabarnomalar" />
      <div className="notification"><Bell size={18} /><span>Hozircha yangi xabarnoma yo'q.</span><small>Boshlang'ich holat</small></div>
    </section>
  );
}

function AdminDashboard({ questions, directionAccess, lessonAccess, directionLessons, completedDirections, directions, setScreen }) {
  const openDirections = directions.filter((item) => directionAccess[item.title]).length;
  const currentDirection = directions.find((item) => directionAccess[item.title] && !completedDirections.includes(item.title))?.title || directions[0].title;
  const courseLessons = directionLessons[currentDirection] || [];
  const currentLessonCount = getUnlockedLessonCount(lessonAccess, currentDirection, courseLessons);
  const totalLessons = Object.values(directionLessons).reduce((total, list) => total + list.length, 0);

  return (
    <section className="panel admin-home">
      <Title title="Boshqaruv paneli" subtitle="Avval yo'nalish qo'shing, keyin mavzu, dars, test va ruxsatlarni shu tartibda boshqaring." />
      <div className="admin-stats">
        <Stat value={directions.length} label="Jami yo'nalishlar" />
        <Stat value={openDirections} label="Ochiq yo'nalishlar" />
        <Stat value={totalLessons} label="Jami mavzular" />
        <Stat value={questions.length} label="Test va nazoratlar" />
      </div>

      <div className="admin-dashboard-grid">
        <div className="admin-guide">
          <h3>Ish tartibi</h3>
          <button onClick={() => setScreen('admin-directions')}><Rocket size={18} /><span>1. Yo'nalish qo'shish</span><small>Python, Arduino yoki yangi kurs nomi</small></button>
          <button onClick={() => setScreen('admin-topic')}><Plus size={18} /><span>2. Mavzu qo'shish</span><small>Tanlangan yo'nalish ichiga dars mavzulari</small></button>
          <button onClick={() => setScreen('admin-lesson')}><BookOpen size={18} /><span>3. Dars qo'shish</span><small>Nazariya matni va video havolasi</small></button>
          <button onClick={() => setScreen('admin-questions')}><FileQuestion size={18} /><span>4. Test va nazoratlar</span><small>Test, kodli topshiriq, yakuniy nazorat</small></button>
          <button onClick={() => setScreen('admin-access')}><ShieldCheck size={18} /><span>5. Ruxsatlar</span><small>O'quvchi qaysi mavzugacha kirishini belgilang</small></button>
        </div>

        <div className="student-track">
          <h3>O'quvchi nazorati</h3>
          <p><span className="mini-avatar">S</span>Sardor Karimov</p>
          <small>Joriy yo'nalish: {currentDirection}</small>
          <small>Ochiq mavzu: {currentLessonCount}. {courseLessons[currentLessonCount - 1] || 'Mavzu kiritilmagan'}</small>
          <small>Tugagan yo'nalishlar: {completedDirections.length}</small>
          <button className="ghost small" onClick={() => setScreen('admin-access')}><ShieldCheck size={15} /> Ruxsatlarni boshqarish</button>
        </div>
      </div>
    </section>
  );
}

function AdminAccess({ directionAccess, setDirectionAccess, lessonAccess, setLessonAccess, directionLessons, completedDirections, directions }) {
  const [direction, setDirection] = useState(directions[0].title);
  const courseLessons = directionLessons[direction] || [];
  const selectedDirectionIndex = directions.findIndex((item) => item.title === direction);
  const isFirstDirection = selectedDirectionIndex === 0;
  const isOpen = Boolean(directionAccess[direction]);
  const unlockedLessonCount = getUnlockedLessonCount(lessonAccess, direction, courseLessons);
  const nextDirection = getNextDirection(directions, direction);

  function toggleDirection() {
    if (isFirstDirection && isOpen) return;
    setDirectionAccess((current) => ({ ...current, [direction]: !isOpen }));
    setLessonAccess((current) => ({ ...current, [direction]: current[direction] || 1 }));
  }

  function setOpenLessons(count) {
    setLessonAccess((current) => ({ ...current, [direction]: clampLessonCount(count, courseLessons) }));
    setDirectionAccess((current) => ({ ...current, [direction]: true }));
  }

  return (
    <section className="panel form-panel">
      <Title title="Ruxsatlarni boshqarish" subtitle="Admin o'quvchiga yo'nalish va mavzularni qo'lda ochib beradi. Yo'nalish tugasa keyingisi avtomatik ochiladi." />
      <div className="access-grid">
        <div>
          <label>O'quvchi<select><option>Sardor Karimov</option></select></label>
          <label>Yo'nalish<select value={direction} onChange={(event) => setDirection(event.target.value)}>{directions.map((item) => <option key={item.title}>{item.title}</option>)}</select></label>
          <div className="access-summary">
            <span className={`status-pill ${isOpen ? 'open' : ''}`}>{isOpen ? 'Ochiq' : 'Yopiq'}</span>
            <b>Ochiq mavzu: {unlockedLessonCount}. {courseLessons[unlockedLessonCount - 1]}</b>
            <small>{completedDirections.includes(direction) ? 'Bu yo\'nalish yakunlangan.' : nextDirection ? `Yakunlansa keyingi yo'nalish ochiladi: ${nextDirection}` : 'Bu oxirgi yo\'nalish.'}</small>
          </div>
          <button className={isOpen ? 'ghost' : 'primary'} disabled={isFirstDirection && isOpen} onClick={toggleDirection}>
            {isOpen ? <Lock size={18} /> : <ShieldCheck size={18} />} {isOpen ? 'Yo\'nalishni yopish' : 'Yo\'nalishni ochish'}
          </button>
        </div>

        <div className="lesson-access-list">
          {courseLessons.map((lesson, index) => {
            const opened = index < unlockedLessonCount;
            return (
              <button key={lesson} className={opened ? 'opened' : ''} onClick={() => setOpenLessons(index + 1)}>
                <span>{index + 1}</span>
                <b>{lesson}</b>
                <small>{opened ? 'Ochiq' : 'Yopiq'}</small>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AdminDirections({ directions, setDirections, setDirectionAccess, setLessonAccess, setDirectionLessons, setSelectedDirection }) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  function addDirection() {
    const title = name.trim();
    if (!title) {
      setMessage("Yo'nalish nomini kiriting.");
      return;
    }
    if (directions.some((item) => matches(item.title, title))) {
      setMessage("Bu yo'nalish allaqachon mavjud.");
      return;
    }

    const colors = ['#27a8ff', '#14b8a6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444'];
    const nextDirection = { title, icon: BookOpen, progress: 0, open: false, color: colors[directions.length % colors.length] };
    setDirections((current) => [...current, nextDirection]);
    setDirectionAccess((current) => ({ ...current, [title]: false }));
    setLessonAccess((current) => ({ ...current, [title]: 1 }));
    setDirectionLessons((current) => ({ ...current, [title]: ['Kirish darsi'] }));
    setSelectedDirection(title);
    setName('');
    setMessage(`${title} yo'nalishi qo'shildi. Ruxsatlar bo'limidan ochib berish mumkin.`);
  }

  return (
    <section className="panel form-panel">
      <Title title="Yo'nalish qo'shish" subtitle="Platformaga yangi yo'nalish qo'shing, keyin uning ichiga mavzular va nazoratlar kiriting." />
      <label>Yo'nalish nomi<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Masalan: JavaScript Dasturlash" /></label>
      {message && <div className="notice"><CheckCircle2 size={18} /> {message}</div>}
      <button className="primary" onClick={addDirection}><Save size={18} /> Yo'nalish qo'shish</button>
      <div className="question-table compact-table">
        {directions.map((item, index) => <p key={item.title}><b>{index + 1}</b><span>{item.title}</span><span>{index === 0 ? 'Asosiy' : 'Qo\'shimcha'}</span><em>{item.progress}%</em></p>)}
      </div>
    </section>
  );
}

function AdminQuestions({ questions, setQuestions, directions, directionLessons }) {
  const [message, setMessage] = useState('');
  const [direction, setDirection] = useState(directions[0].title);
  const [topic, setTopic] = useState((directionLessons[directions[0].title] || lessons)[0]);
  const [section, setSection] = useState('test');
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState('');
  const [correct, setCorrect] = useState('1');
  const [code, setCode] = useState('# Kodi shu yerga yozing');
  const [checkWords, setCheckWords] = useState('');

  function selectDirection(value) {
    const topics = directionLessons[value] || [];
    setDirection(value);
    setTopic(topics[0] || '');
  }

  function saveManualQuestion() {
    const text = question.trim();
    if (!text) {
      setMessage('Shart yoki savol matnini kiriting.');
      return;
    }

    const answerList = splitList(answers);
    const isChoice = section === 'test' || section === 'exam';
    if (isChoice && answerList.length < 2) {
      setMessage('Test yoki yakuniy nazorat uchun kamida 2 ta javob varianti kiriting.');
      return;
    }

    const item = {
      id: createId(),
      direction,
      topic,
      section,
      question: text,
      answers: answerList,
      correct: parseCorrectAnswer(correct, answerList),
      code: code.trim() || '# Kodi shu yerga yozing',
      checkWords: splitList(checkWords),
      points: section === 'practice' ? 8 : 4,
    };
    setQuestions((current) => [...current, item]);
    setQuestion('');
    setAnswers('');
    setCorrect('1');
    setCode('# Kodi shu yerga yozing');
    setCheckWords('');
    setMessage(`${section === 'exam' ? 'Yakuniy nazorat' : section === 'practice' ? 'Kodli topshiriq' : 'Test'} qo'shildi.`);
  }

  async function importExcel(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const imported = rows.map(mapExcelQuestion).filter(Boolean);
      if (!imported.length) {
        setMessage('Excel faylda savol topilmadi. "savol" yoki "question" ustuni kerak.');
        return;
      }
      setQuestions((current) => [...current, ...imported]);
      setMessage(`${imported.length} ta savol bazaga yuklandi. Test, amaliyot va yakuniy imtihon uchun ishlaydi.`);
    } catch {
      setMessage('Excel faylni o\'qib bo\'lmadi. .xlsx, .xls yoki .csv fayl yuklang.');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <section className="panel form-panel">
      <Title title="Test va nazoratlar" subtitle="Mavzu ichiga test, kodli topshiriq yoki yakuniy nazorat qo'shing. Excel orqali ham yuklash mumkin." />
      <div className="content-form-grid">
        <label>Yo'nalish<select value={direction} onChange={(event) => selectDirection(event.target.value)}>{directions.map((item) => <option key={item.title}>{item.title}</option>)}</select></label>
        <label>Mavzu<select value={topic} onChange={(event) => setTopic(event.target.value)}>{(directionLessons[direction] || []).map((lesson) => <option key={lesson}>{lesson}</option>)}</select></label>
        <label>Nazorat turi<select value={section} onChange={(event) => setSection(event.target.value)}><option value="test">Test</option><option value="practice">Kodli topshiriq</option><option value="exam">Yakuniy nazorat</option></select></label>
      </div>
      <label>Admin sharti / savol matni<textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Masalan: name o'zgaruvchisini yarating va ekranga chiqaring." /></label>
      {(section === 'test' || section === 'exam') && (
        <div className="content-form-grid">
          <label>Javob variantlari<textarea value={answers} onChange={(event) => setAnswers(event.target.value)} placeholder="Har bir variantni yangi qatorda yoki ; bilan kiriting" /></label>
          <label>To'g'ri javob<input value={correct} onChange={(event) => setCorrect(event.target.value)} placeholder="1, A yoki javob matni" /></label>
        </div>
      )}
      <div className="content-form-grid">
        <label>Kod yozish uchun boshlang'ich input<textarea value={code} onChange={(event) => setCode(event.target.value)} placeholder="# Kodi shu yerga yozing" /></label>
        <label>Tekshiruv kalit so'zlari<textarea value={checkWords} onChange={(event) => setCheckWords(event.target.value)} placeholder="print; input; name" /></label>
      </div>
      <button className="primary" onClick={saveManualQuestion}><Save size={18} /> Nazorat qo'shish</button>
      <label className="upload-box"><Upload size={24} /> Excel fayl yuklash<input type="file" accept=".xlsx,.xls,.csv" onChange={importExcel} /></label>
      {message && <div className="notice"><CheckCircle2 size={18} /> {message}</div>}
      <div className="question-table">
        {questions.map((item, index) => <p key={item.id}><b>{index + 1}</b><span>{item.direction}</span><span>{item.section}</span><em>{item.question}</em></p>)}
      </div>
    </section>
  );
}

function AdminTopic({ directions, directionLessons, updateCourseLessons, setSelectedDirection, setSelectedLesson, setLessonAccess }) {
  const [direction, setDirection] = useState(directions[0].title);
  const [topicName, setTopicName] = useState('');
  const courseLessons = directionLessons[direction] || [];
  const [order, setOrder] = useState(String(courseLessons.length + 1));
  const [message, setMessage] = useState('');

  function selectDirection(value) {
    setDirection(value);
    setOrder(String((directionLessons[value] || []).length + 1));
  }

  function saveTopic() {
    const name = topicName.trim();
    if (!name) {
      setMessage('Mavzu nomini kiriting.');
      return;
    }
    if (courseLessons.includes(name)) {
      setMessage('Bu mavzu allaqachon mavjud.');
      return;
    }
    const next = [...courseLessons];
    const index = Math.max(0, Math.min(next.length, Number(order) - 1 || next.length));
    next.splice(index, 0, name);
    updateCourseLessons(direction, next);
    setLessonAccess((current) => ({ ...current, [direction]: Math.max(current[direction] || 1, index + 1) }));
    setSelectedDirection(direction);
    setSelectedLesson(index);
    setTopicName('');
    setOrder(String(next.length + 1));
    setMessage(`${direction} yo'nalishiga ${name} mavzusi qo'shildi.`);
  }

  return (
    <section className="panel form-panel">
      <Title title="Yangi mavzu qo'shish" />
      <label>Yo'nalish<select value={direction} onChange={(event) => selectDirection(event.target.value)}>{directions.map((item) => <option key={item.title}>{item.title}</option>)}</select></label>
      <label>Mavzu nomi<input value={topicName} onChange={(event) => setTopicName(event.target.value)} placeholder="Masalan: Functions" /></label>
      <label>Tartib raqami<input value={order} onChange={(event) => setOrder(event.target.value)} /></label>
      <label>Qisqacha tavsif<textarea placeholder="Mavzu haqida qisqacha ma'lumot..." /></label>
      {message && <div className="notice"><CheckCircle2 size={18} /> {message}</div>}
      <button className="primary" onClick={saveTopic}><Save size={18} /> Saqlash</button>
    </section>
  );
}

function getLessonContentKey(direction, topic) {
  return `${direction}::${topic}`;
}

function getLessonContent(lessonContents, direction, topic) {
  return lessonContents[getLessonContentKey(direction, topic)] || lessonContents[topic] || {};
}

function AdminLesson({ directions, directionLessons, lessonContents, setLessonContents }) {
  const [direction, setDirection] = useState(directions[0].title);
  const currentLessons = directionLessons[direction] || [];
  const [topic, setTopic] = useState(currentLessons[0] || '');
  const initialContent = getLessonContent(lessonContents, direction, currentLessons[0] || '');
  const [title, setTitle] = useState(initialContent.title || currentLessons[0] || '');
  const [videoUrl, setVideoUrl] = useState(initialContent.videoUrl || '');
  const [text, setText] = useState(initialContent.text || '');
  const [message, setMessage] = useState('');

  function selectDirection(value) {
    const topics = directionLessons[value] || [];
    const nextTopic = topics[0] || '';
    setDirection(value);
    selectTopic(nextTopic, value);
  }

  function selectTopic(value, nextDirection = direction) {
    const content = getLessonContent(lessonContents, nextDirection, value);
    setTopic(value);
    setTitle(content.title || value);
    setVideoUrl(content.videoUrl || '');
    setText(content.text || '');
  }

  function saveLesson() {
    setLessonContents((current) => ({
      ...current,
      [getLessonContentKey(direction, topic)]: {
        title: title.trim() || topic,
        videoUrl: videoUrl.trim(),
        text: text.trim() || 'Dars matni hali kiritilmagan.',
      },
    }));
    setMessage(`${direction} / ${topic} darsi saqlandi.`);
  }

  return (
    <section className="panel form-panel">
      <Title title="Nazariy dars qo'shish" />
      <label>Yo'nalish<select value={direction} onChange={(event) => selectDirection(event.target.value)}>{directions.map((item) => <option key={item.title}>{item.title}</option>)}</select></label>
      <label>Mavzu<select value={topic} onChange={(event) => selectTopic(event.target.value)}>{currentLessons.map((lesson) => <option key={lesson}>{lesson}</option>)}</select></label>
      <label>Sarlavha<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="O'zgaruvchilar nima?" /></label>
      <label>Video URL yoki fayl<input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://youtube.com/..." /></label>
      <label>Matn<textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Dars matni..." /></label>
      {message && <div className="notice"><CheckCircle2 size={18} /> {message}</div>}
      <button className="primary" onClick={saveLesson}><Save size={18} /> Saqlash</button>
    </section>
  );
}

function Title({ title, subtitle, action }) {
  return <div className="title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

function Stat({ value, label }) {
  return <div className="stat"><b>{value}</b><span>{label}</span></div>;
}

function Info({ icon: Icon, title, text }) {
  return <div className="info"><Icon size={22} /><b>{title}</b><small>{text}</small></div>;
}

function StudentVisual({ compact, variant = 'front' }) {
  const src = variant === 'side' ? '/assets/student-coding-right.png' : '/assets/student-coding-left.png';
  const alt = variant === 'side' ? 'Noutbukda kod yozayotgan oquvchi' : 'Kompyuter qarshisida dasturlayotgan oquvchi';
  return (
    <figure className={`student-visual ${compact ? 'compact' : ''}`}>
      <img src={src} alt={alt} />
    </figure>
  );
}

createRoot(document.getElementById('root')).render(<App />);
