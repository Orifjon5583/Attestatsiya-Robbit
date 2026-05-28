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

const API_URL = import.meta.env.VITE_API_URL || '/api';
const APP_STATE_STORAGE_KEY = 'attestatsiya.appState';

const iconRegistry = {
  Award,
  BookOpen,
  Bot,
  Code2,
  Cpu,
  FileCode,
  Lock,
  Rocket,
  Settings,
  ShieldCheck,
};

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

function readCookie(name) {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');
}

async function apiRequest(path, options = {}) {
  const method = options.method || 'GET';
  const csrfToken = readCookie('attestatsiya_csrf');
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(method !== 'GET' && csrfToken ? { 'X-CSRF-Token': decodeURIComponent(csrfToken) } : {}),
      ...options.headers,
    },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `API error: ${response.status}`);
  return payload;
}

function serializeDirections(directionList) {
  return directionList.map((item) => {
    const icon = Object.entries(iconRegistry).find(([, Icon]) => Icon === item.icon)?.[0] || item.icon || 'BookOpen';
    return { ...item, icon };
  });
}

function hydrateDirections(directionList) {
  return directionList.map((item) => ({
    ...item,
    icon: iconRegistry[item.icon] || iconRegistry[item.iconName] || BookOpen,
  }));
}

function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
}

function getDefaultCodeSnippet(direction, lesson) {
  const dir = String(direction || '').toLowerCase();
  if (dir.includes('python')) {
    return `# Python-da o'zgaruvchilar va chiqish\nname = "Sardor"\nage = 20\nprint(f"Ism: {name}, Yosh: {age}")\n\n# Ro'yxat bilan ishlash\nsonlar = [1, 2, 3, 4, 5]\nkvadratlar = [x**2 for x in sonlar]\nprint("Kvadratlar:", kvadratlar)`;
  }
  if (dir.includes('arduino') || dir.includes('esp32')) {
    return `// Arduino / ESP32 platasi uchun kod\nconst int LED_PIN = 13;\n\nvoid setup() {\n  // Raqamli pinni chiqish rejimiga o'tkazish\n  pinMode(LED_PIN, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  digitalWrite(LED_PIN, HIGH); // LEDni yoqish\n  delay(1000);\n  digitalWrite(LED_PIN, LOW);  // LEDni o'chirish\n  delay(1000);\n  Serial.println("LED miltillamoqda...");\n}`;
  }
  if (dir.includes('web') || dir.includes('html') || dir.includes('javascript')) {
    return `<!-- HTML5 va oddiy JavaScript namuna -->\n<!DOCTYPE html>\n<html>\n<head>\n  <title>Mening sahifam</title>\n  <style>\n    body { font-family: sans-serif; background: #f0f0f0; text-align: center; }\n    h1 { color: #333; }\n  </style>\n</head>\n<body>\n  <h1 id="title">Salom, Dunyo!</h1>\n  <button onclick="changeTitle()">Rangni o'zgartirish</button>\n\n  <script>\n    function changeTitle() {\n      const t = document.getElementById('title');\n      t.style.color = t.style.color === 'red' ? '#333' : 'red';\n    }\n  </script>\n</body>\n</html>`;
  }
  if (dir.includes('blynk') || dir.includes('iot')) {
    return `// IoT Blynk loyihasi uchun kod\n#define BLYNK_TEMPLATE_ID "TMPLxxxxxx"\n#define BLYNK_TEMPLATE_NAME "Device"\n\n#include <WiFi.h>\n#include <BlynkSimpleEsp32.h>\n\nchar auth[] = "Sening_Blynk_Tokening";\nchar ssid[] = "Sening_WiFi_Noming";\nchar pass[] = "Sening_WiFi_Paroling";\n\nvoid setup() {\n  Blynk.begin(auth, ssid, pass);\n}\n\nvoid loop() {\n  Blynk.run();\n}`;
  }
  return `// ${direction} - ${lesson} bo'yicha boshlang'ich kod namunasi\n// Nazariya va amaliy topshiriqlarni boshlang...`;
}


function createAppStateSnapshot({ managedDirections, directionLessons, lessonContents, users, questions, messages }) {
  return {
    directions: serializeDirections(managedDirections),
    directionLessons,
    lessonContents,
    users: Object.fromEntries(Object.entries(users || {}).map(([email, user]) => {
      const { password, passwordHash, ...safeUser } = user || {};
      return [email, safeUser];
    })),
    questions,
    messages,
  };
}

function normalizeSection(value, answers) {
  const text = normalize(value);
  if (text.includes('loyiha') || text.includes('final task') || text.includes('yakuniy topshiriq')) return 'final';
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
  { title: 'App Inventor', icon: Bot, progress: 0, open: false, color: '#94a3b8' },
  { title: 'Onshape', icon: Settings, progress: 0, open: false, color: '#22c55e' },
  { title: 'ESP32', icon: Cpu, progress: 0, open: false, color: '#64748b' },
  { title: 'IoT (Blynk)', icon: ShieldCheck, progress: 0, open: false, color: '#64748b' },
  { title: 'Web Dasturlash', icon: FileCode, progress: 0, open: false, color: '#8b9bb2' },
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

const webLessons = ['HTML', 'CSS', 'JavaScript'];

const initialDirectionLessons = Object.fromEntries(
  directions.map((item) => [item.title, item.title === 'Web Dasturlash' ? webLessons : lessons]),
);

function putWebDirectionLast(directionList) {
  const list = Array.isArray(directionList) ? directionList : directions;
  const webDirection = list.find((item) => item.title === 'Web Dasturlash');
  const otherDirections = list.filter((item) => item.title !== 'Web Dasturlash');
  return webDirection ? [...otherDirections, { ...webDirection, icon: FileCode }] : otherDirections;
}

function normalizeDirectionLessonsMap(directionLessons) {
  return {
    ...(directionLessons || {}),
    'Web Dasturlash': webLessons,
  };
}

const initialLessonContents = {
  'Variables (O\'zgaruvchilar)': {
    title: "O'zgaruvchi nima?",
    text: "O'zgaruvchi dasturda qiymat saqlash uchun nomlangan joydir. Python'da o'zgaruvchi nomi yozilib, unga qiymat beriladi.",
    videoUrl: '',
  },
};

const initialStudentProfile = {
  fullName: 'Sardor Karimov',
  email: 'em.sardor@gmail.com',
  phone: '+998 90 123 45 67',
  birthDate: '15.01.2004',
  roleLabel: "O'quvchi",
};

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function createStudentUser({ fullName, email }) {
  const normalizedEmail = normalizeEmail(email);
  return {
    email: normalizedEmail,
    role: 'student',
    profile: {
      ...initialStudentProfile,
      fullName: fullName?.trim() || initialStudentProfile.fullName,
      email: normalizedEmail,
    },
    directionAccess: initialDirectionAccess,
    lessonAccess: initialLessonAccess,
    completedDirections: [],
    result: null,
  };
}

const defaultStudentEmail = normalizeEmail(initialStudentProfile.email);
const initialUsers = {
  [defaultStudentEmail]: createStudentUser({
    fullName: initialStudentProfile.fullName,
    email: defaultStudentEmail,
  }),
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
    id: 'q2b',
    direction: 'Python Dasturlash',
    topic: 'Variables (O\'zgaruvchilar)',
    section: 'practice',
    question: 'city o\'zgaruvchisini yarating va qiymatini ekranga chiqaring.',
    code: '# Kodi shu yerga yozing\ncity = "Toshkent"\nprint(city)',
    checkWords: ['city', 'print'],
    points: 8,
  },
  {
    id: 'q2c',
    direction: 'Python Dasturlash',
    topic: 'Variables (O\'zgaruvchilar)',
    section: 'practice',
    question: 'a va b sonlarini yarating, ularning yig\'indisini result o\'zgaruvchisiga yozing.',
    code: '# Kodi shu yerga yozing\na = 7\nb = 5\nresult = a + b\nprint(result)',
    checkWords: ['a', 'b', 'result', 'print'],
    points: 8,
  },
  {
    id: 'q2d',
    direction: 'Python Dasturlash',
    topic: 'Variables (O\'zgaruvchilar)',
    section: 'practice',
    question: 'first_name va last_name o\'zgaruvchilarini birlashtirib full_name chiqaring.',
    code: '# Kodi shu yerga yozing\nfirst_name = "Ali"\nlast_name = "Valiyev"\nfull_name = first_name + " " + last_name\nprint(full_name)',
    checkWords: ['first_name', 'last_name', 'full_name', 'print'],
    points: 8,
  },
  {
    id: 'q2e',
    direction: 'Python Dasturlash',
    topic: 'Variables (O\'zgaruvchilar)',
    section: 'practice',
    question: 'price va count o\'zgaruvchilari orqali total narxni hisoblang.',
    code: '# Kodi shu yerga yozing\nprice = 12000\ncount = 3\ntotal = price * count\nprint(total)',
    checkWords: ['price', 'count', 'total', 'print'],
    points: 8,
  },
  {
    id: 'q1b',
    direction: 'Python Dasturlash',
    topic: 'Variables (O\'zgaruvchilar)',
    section: 'test',
    question: 'Python\'da qiymat berish operatori qaysi?',
    answers: ['==', '=', '=>', ':='],
    correct: 1,
    points: 4,
  },
  {
    id: 'q1c',
    direction: 'Python Dasturlash',
    topic: 'Variables (O\'zgaruvchilar)',
    section: 'test',
    question: 'Quyidagilardan qaysi biri to\'g\'ri o\'zgaruvchi nomi?',
    answers: ['2name', 'full_name', 'full-name', 'class'],
    correct: 1,
    points: 4,
  },
  {
    id: 'q1d',
    direction: 'Python Dasturlash',
    topic: 'Variables (O\'zgaruvchilar)',
    section: 'test',
    question: 'print() funksiyasi nima qiladi?',
    answers: ['Kodga izoh yozadi', 'Ma\'lumotni ekranga chiqaradi', 'Faylni o\'chiradi', 'O\'zgaruvchini yashiradi'],
    correct: 1,
    points: 4,
  },
  {
    id: 'q1e',
    direction: 'Python Dasturlash',
    topic: 'Variables (O\'zgaruvchilar)',
    section: 'test',
    question: 'Matn qiymati odatda qanday yoziladi?',
    answers: ['Qo\'shtirnoq ichida', 'Faqat raqam bilan', '# belgisi bilan', 'Qavs tashqarisida'],
    correct: 0,
    points: 4,
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
  {
    id: 'q3b',
    direction: 'Python Dasturlash',
    topic: 'Variables (O\'zgaruvchilar)',
    section: 'exam',
    question: 'name = "Ali" kodida name nima?',
    answers: ['Funksiya', 'O\'zgaruvchi nomi', 'Operator', 'Izoh'],
    correct: 1,
    points: 4,
  },
  {
    id: 'q3c',
    direction: 'Python Dasturlash',
    topic: 'Variables (O\'zgaruvchilar)',
    section: 'exam',
    question: 'Quyidagi kod natijasi nima: x = 2; y = 3; print(x + y)',
    answers: ['23', '5', 'x + y', 'Error'],
    correct: 1,
    points: 4,
  },
  {
    id: 'q3d',
    direction: 'Python Dasturlash',
    topic: 'Variables (O\'zgaruvchilar)',
    section: 'exam',
    question: 'Python\'da izoh qaysi belgi bilan boshlanadi?',
    answers: ['#', '//', '<!--', '**'],
    correct: 0,
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
      { id: 'admin-theory-questions', label: 'Nazariy savol-javob', icon: ClipboardCheck },
      { id: 'admin-test-questions', label: 'Test qo\'shish', icon: FileQuestion },
      { id: 'admin-code-tasks', label: 'Kod yozish qismi', icon: Code2 },
      { id: 'admin-final-tasks', label: 'Yakuniy quiz va dastur', icon: Award },
    ],
  },
  {
    title: "O'quvchi",
    items: [
      { id: 'admin-access', label: 'Ruxsatlar', icon: ShieldCheck },
      { id: 'admin-users', label: 'User loginlari', icon: Users },
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

function getDirectionProgress(directionAccess, lessonAccess, completedDirections, direction, courseLessons) {
  if (!directionAccess[direction]) return 0;
  if (!courseLessons.length) return 0;
  if (completedDirections.includes(direction)) return 100;
  return Math.round((getUnlockedLessonCount(lessonAccess, direction, courseLessons) / courseLessons.length) * 100);
}

function getNextDirection(directionList, title) {
  const list = directionList?.length ? directionList : directions;
  const index = list.findIndex((item) => item.title === title);
  return list[index + 1]?.title || null;
}

function unlockNextLesson(setLessonAccess, direction, selectedLesson, courseLessons) {
  if (!courseLessons.length || selectedLesson >= courseLessons.length - 1) return false;
  const nextLessonCount = selectedLesson + 2;
  setLessonAccess((current) => ({
    ...current,
    [direction]: Math.max(current[direction] || 1, nextLessonCount),
  }));
  return true;
}

function App() {
  const [screen, setScreen] = useState('home');
  const [role, setRole] = useState('student');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState(defaultStudentEmail);
  const [databaseStatus, setDatabaseStatus] = useState('checking');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [appStateLoaded, setAppStateLoaded] = useState(false);
  const [selectedDirection, setSelectedDirection] = useState('Python Dasturlash');
  const [selectedLesson, setSelectedLesson] = useState(0);
  const [managedDirections, setManagedDirections] = useState(directions);
  const [directionLessons, setDirectionLessons] = useState(initialDirectionLessons);
  const [lessonContents, setLessonContents] = useState(initialLessonContents);
  const [users, setUsers] = useState(initialUsers);
  const [studentProfile, setStudentProfile] = useState(initialStudentProfile);
  const [questions, setQuestions] = useState(() => {
    const stored = readStored('attestatsiya.questions', []);
    const storedIds = new Set(stored.map((item) => item.id));
    return [...starterQuestions.filter((item) => !storedIds.has(item.id)), ...stored];
  });
  const [messages, setMessages] = useState([]);
  const [result, setResult] = useState(null);
  const [directionAccess, setDirectionAccess] = useState(initialDirectionAccess);
  const [lessonAccess, setLessonAccess] = useState(initialLessonAccess);
  const [completedDirections, setCompletedDirections] = useState([]);
  const courseLessons = directionLessons[selectedDirection] || [];

  useEffect(() => {
    writeStored('attestatsiya.questions', questions);
  }, [questions]);

  function applyUserState(user) {
    if (!user) return;
    setStudentProfile({ ...initialStudentProfile, ...user.profile, email: normalizeEmail(user.email || user.profile?.email) });
    setDirectionAccess(user.directionAccess || initialDirectionAccess);
    setLessonAccess(user.lessonAccess || initialLessonAccess);
    setCompletedDirections(user.completedDirections || []);
    setResult(user.result || null);
  }

  function applyAppState(data) {
    if (Array.isArray(data.directions) && data.directions.length) {
      setManagedDirections(putWebDirectionLast(hydrateDirections(data.directions)));
    }
    setDirectionLessons(normalizeDirectionLessonsMap(data.directionLessons || initialDirectionLessons));
    if (data.lessonContents) setLessonContents(data.lessonContents);
    if (Array.isArray(data.questions) && data.questions.length) setQuestions(data.questions);
    if (Array.isArray(data.messages)) setMessages(data.messages);

    const loadedUsers = data.users || {
      [defaultStudentEmail]: {
        ...initialUsers[defaultStudentEmail],
        profile: { ...initialStudentProfile, ...(data.studentProfile || {}) },
        directionAccess: data.directionAccess || initialDirectionAccess,
        lessonAccess: data.lessonAccess || initialLessonAccess,
        completedDirections: data.completedDirections || [],
        result: data.result || null,
      },
    };
    setUsers(loadedUsers);
    const selectedUser = loadedUsers[currentUserEmail] || Object.values(loadedUsers)[0];
    if (selectedUser?.email) setCurrentUserEmail(normalizeEmail(selectedUser.email));
    applyUserState(selectedUser);
  }

  useEffect(() => {
    let active = true;

    async function loadAppState() {
      if (!isAuthenticated) {
        setAppStateLoaded(true);
        return;
      }
      setAppStateLoaded(false);
      const localState = readStored(APP_STATE_STORAGE_KEY, null);
      if (localState) applyAppState(localState);

      try {
        const payload = await apiRequest('/app-state');
        const data = payload.data || {};
        if (!active) return;

        applyAppState(data);
        setDatabaseStatus('connected');
      } catch {
        if (!localState) {
          const fallbackUser = users[currentUserEmail] || initialUsers[defaultStudentEmail];
          setCurrentUserEmail(normalizeEmail(fallbackUser.email));
          applyUserState(fallbackUser);
        }
        if (active) setDatabaseStatus('offline');
      } finally {
        if (active) setAppStateLoaded(true);
      }
    }

    loadAppState();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    let active = true;
    apiRequest('/auth/session')
      .then(({ user }) => {
        if (!active || !user?.email) return;
        const userRole = user.role === 'admin' ? 'admin' : 'student';
        setAppStateLoaded(false);
        setRole(userRole);
        setCurrentUserEmail(normalizeEmail(user.email));
        setIsAuthenticated(true);
        setScreen(userRole === 'admin' ? 'admin' : 'dashboard');
      })
      .catch(() => {
        if (active) setIsAuthenticated(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!appStateLoaded || !isAuthenticated) return;
    const snapshot = createAppStateSnapshot({ managedDirections, directionLessons, lessonContents, users, questions, messages });
    writeStored(APP_STATE_STORAGE_KEY, snapshot);
    setSaveStatus('saving');

    const timeoutId = setTimeout(() => {
      apiRequest('/app-state', {
        method: 'PUT',
        body: JSON.stringify({
          data: snapshot,
          actorRole: role,
          actorEmail: currentUserEmail,
        }),
      })
        .then(() => {
          setDatabaseStatus('connected');
          setSaveStatus('saved');
        })
        .catch(() => {
          setDatabaseStatus('offline');
          setSaveStatus('local');
        });
    }, 450);

    return () => clearTimeout(timeoutId);
  }, [appStateLoaded, currentUserEmail, directionLessons, lessonContents, managedDirections, messages, questions, role, users]);

  useEffect(() => {
    if (!currentUserEmail) return;
    setUsers((current) => {
      const user = current[currentUserEmail];
      if (!user) return current;
      return {
        ...current,
        [currentUserEmail]: {
          ...user,
          profile: { ...studentProfile, email: currentUserEmail },
          directionAccess,
          lessonAccess,
          completedDirections,
          result,
        },
      };
    });
  }, [completedDirections, currentUserEmail, directionAccess, lessonAccess, result, studentProfile]);

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

  function authenticateStudent(email, password) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then(({ user }) => {
      const normalizedEmail = normalizeEmail(user.email);
      setAppStateLoaded(false);
      setRole('student');
      setCurrentUserEmail(normalizedEmail);
      applyUserState(users[normalizedEmail] || user);
      setIsAuthenticated(true);
      setScreen('dashboard');
      return { ok: true };
    }).catch((error) => ({ ok: false, message: error.message }));
  }

  function registerStudent({ fullName, email, password }) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !password || !fullName.trim()) return Promise.resolve({ ok: false, message: "Ism, email va parolni to'ldiring." });
    if (password.length < 8) return Promise.resolve({ ok: false, message: 'Parol kamida 8 belgidan iborat bo‘lsin.' });

    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ fullName, email: normalizedEmail, password }),
    }).then(({ user }) => {
      setAppStateLoaded(false);
      setUsers((current) => ({ ...current, [normalizedEmail]: user }));
      setRole('student');
      setCurrentUserEmail(normalizedEmail);
      applyUserState(user);
      setIsAuthenticated(true);
      setScreen('dashboard');
      return { ok: true };
    }).catch((error) => ({ ok: false, message: error.message }));
  }

  function loginAdmin(email, password) {
    return apiRequest('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then(({ user }) => {
      setAppStateLoaded(false);
      setRole('admin');
      setCurrentUserEmail(normalizeEmail(user.email));
      setStudentProfile({ ...initialStudentProfile, ...user.profile });
      setIsAuthenticated(true);
      setScreen('admin');
      return { ok: true };
    }).catch((error) => ({ ok: false, message: error.message }));
  }

  function logout() {
    apiRequest('/auth/logout', { method: 'POST', body: JSON.stringify({}) }).catch(() => {});
    setRole('student');
    setIsAuthenticated(false);
    setResult(null);
    setScreen('login');
  }

  const page = useMemo(() => {
    const props = { setScreen, selectedDirection, setSelectedDirection, selectedLesson, setSelectedLesson, courseLessons, setCourseLessons, directionLessons, setDirectionLessons, updateCourseLessons, lessonContents, setLessonContents, studentProfile, setStudentProfile, questions, setQuestions, result, setResult, directionAccess, setDirectionAccess, lessonAccess, setLessonAccess, completedDirections, completeDirection, directions: managedDirections, setDirections: setManagedDirections };
    if (screen === 'home') return <HomePage setScreen={setScreen} />;
    if (screen === 'register') return <RegisterPage setScreen={setScreen} onRegister={registerStudent} />;
    if (screen === 'login') return <LoginPage setScreen={setScreen} onLogin={authenticateStudent} onAdminLogin={loginAdmin} />;
    if (!isAuthenticated) return <LoginPage setScreen={setScreen} onLogin={authenticateStudent} onAdminLogin={loginAdmin} />;
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
    if (screen === 'certificate') return <CertificatePage selectedDirection={selectedDirection} result={result} studentProfile={studentProfile} />;
    if (screen === 'profile') return <ProfilePage studentProfile={studentProfile} setStudentProfile={setStudentProfile} />;
    if (screen === 'notifications') return <NotificationsPage role={role} currentUserEmail={currentUserEmail} users={users} messages={messages} setMessages={setMessages} />;
    if (screen.startsWith('admin') && role !== 'admin') return <DashboardPage {...props} />;
    if (screen === 'admin') return <AdminDashboard questions={questions} directionAccess={directionAccess} lessonAccess={lessonAccess} directionLessons={directionLessons} completedDirections={completedDirections} directions={managedDirections} setScreen={setScreen} databaseStatus={databaseStatus} saveStatus={saveStatus} studentProfile={studentProfile} users={users} />;
    if (screen === 'admin-directions') return <AdminDirections directions={managedDirections} setDirections={setManagedDirections} setDirectionAccess={setDirectionAccess} setLessonAccess={setLessonAccess} setDirectionLessons={setDirectionLessons} setSelectedDirection={setSelectedDirection} setUsers={setUsers} />;
    if (screen === 'admin-theory-questions') return <AdminTheoryQuestions questions={questions} setQuestions={setQuestions} directions={managedDirections} directionLessons={directionLessons} />;
    if (screen === 'admin-test-questions' || screen === 'admin-questions') return <AdminQuestions mode="test" questions={questions} setQuestions={setQuestions} directions={managedDirections} directionLessons={directionLessons} />;
    if (screen === 'admin-code-tasks') return <AdminQuestions mode="code" questions={questions} setQuestions={setQuestions} directions={managedDirections} directionLessons={directionLessons} />;
    if (screen === 'admin-final-tasks') return <AdminQuestions mode="final" questions={questions} setQuestions={setQuestions} directions={managedDirections} directionLessons={directionLessons} />;
    if (screen === 'admin-access') return <AdminAccess directionLessons={directionLessons} directions={managedDirections} users={users} setUsers={setUsers} currentUserEmail={currentUserEmail} setDirectionAccess={setDirectionAccess} setLessonAccess={setLessonAccess} setCompletedDirections={setCompletedDirections} />;
    if (screen === 'admin-users') return <AdminUsers users={users} setUsers={setUsers} messages={messages} setMessages={setMessages} currentUserEmail={currentUserEmail} setCurrentUserEmail={setCurrentUserEmail} setStudentProfile={setStudentProfile} />;
    if (screen === 'admin-topic') return <AdminTopic {...props} />;
    if (screen === 'admin-lesson') return <AdminLesson {...props} />;
    return <DashboardPage {...props} />;
  }, [completedDirections, courseLessons, currentUserEmail, databaseStatus, directionAccess, directionLessons, isAuthenticated, lessonAccess, lessonContents, managedDirections, messages, questions, result, role, saveStatus, screen, selectedDirection, selectedLesson, studentProfile, users]);

  if (['home', 'register', 'login'].includes(screen) || !isAuthenticated) return page;

  /*
  async function resetUserPassword() {
    const targetEmail = normalizeEmail(form.email || selectedEmail);
    if (!targetEmail || form.nextPassword.length < 8) {
      setMessage('Yangi parol kamida 8 belgidan iborat bo‘lsin.');
      return;
    }
    try {
      const result = await apiRequest('/admin/users/password', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail, nextPassword: form.nextPassword }),
      });
      setForm((current) => ({ ...current, nextPassword: '' }));
      setMessage(result.message || 'User paroli yangilandi.');
    } catch (error) {
      setMessage(error.message || 'User parolini yangilab bo‘lmadi.');
    }
  }

  */
  return (
    <div className="shell">
      <Sidebar role={role} screen={screen} setScreen={setScreen} onLogout={logout} />
      <main className="main">
        <Topbar role={role} setScreen={setScreen} studentProfile={studentProfile} currentUserEmail={currentUserEmail} messages={messages} />
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

function RegisterPage({ setScreen, onRegister }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  async function submit() {
    if (password !== confirmPassword) {
      setMessage('Parol tasdigʻi mos emas.');
      return;
    }
    const result = await onRegister({ fullName, email, password });
    if (!result.ok) setMessage(result.message);
  }

  return (
    <div className="public auth-split">
      <form className="auth-card">
        <Brand />
        <h2>Ro'yxatdan o'tish</h2>
        <label>Ism<input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Ismingiz" /></label>
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" /></label>
        <label>Parol<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Parol" /></label>
        <label>Parolni tasdiqlang<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Qayta kiriting" /></label>
        <label className="check"><input type="checkbox" defaultChecked /> Men foydalanish shartlari bilan roziman</label>
        {message && <div className="notice auth-notice"><InfoIcon size={18} /> {message}</div>}
        <button type="button" className="primary wide" onClick={submit}><UserPlus size={18} /> Ro'yxatdan o'tish</button>
        <p>Hisobingiz bormi? <button type="button" className="link" onClick={() => setScreen('login')}><LogIn size={15} /> Kirish</button></p>
      </form>
      <StudentVisual variant="front" compact />
    </div>
  );
}

function LoginPage({ setScreen, onLogin, onAdminLogin }) {
  const [mode, setMode] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const isAdmin = mode === 'admin';

  async function secureSubmit() {
    setMessage('');
    const result = isAdmin ? await onAdminLogin(email, password) : await onLogin(email, password);
    if (!result.ok) setMessage(result.message || 'Login yoki parol xato.');
  }

  async function submit() {
    if (!onLogin(email, password)) setMessage('Email yoki parol notoʻgʻri.');
  }

  return (
    <div className="public auth-split">
      <form className="auth-card">
        <Brand />
        <h2>{isAdmin ? 'Admin login' : 'Tizimga kirish'}</h2>
        <div className="segmented">
          <button type="button" className={!isAdmin ? 'active' : ''} onClick={() => setMode('student')}><User size={16} /> O'quvchi</button>
          <button type="button" className={isAdmin ? 'active' : ''} onClick={() => setMode('admin')}><ShieldCheck size={16} /> Admin</button>
        </div>
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
        <label>Parol<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {message && <div className="notice auth-notice"><InfoIcon size={18} /> {message}</div>}
        <button type="button" className="primary wide" onClick={secureSubmit}><LogIn size={18} /> Kirish</button>
        <p>Hisobingiz yo'qmi? <button type="button" className="link" onClick={() => setScreen('register')}><UserPlus size={15} /> Ro'yxatdan o'tish</button></p>
      </form>
      <StudentVisual variant="side" compact />
    </div>
  );
}

function Sidebar({ role, screen, setScreen, onLogout }) {
  const groups = role === 'admin' ? adminNav : [{ title: '', items: nav }];
  const defaultOpenGroups = Object.fromEntries(groups.map((group) => [
    group.title || 'main',
    true,
  ]));
  const [openGroups, setOpenGroups] = useState(defaultOpenGroups);

  useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current };
      groups.forEach((group) => {
        const key = group.title || 'main';
        if (!(key in next)) next[key] = true;
      });
      return next;
    });
  }, [groups]);

  function toggleGroup(key) {
    setOpenGroups((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <aside className="sidebar">
      <Brand />
      <nav>
        {groups.map((group) => {
          const key = group.title || 'main';
          const isOpen = Boolean(openGroups[key]);
          return (
          <div className={`nav-group ${isOpen ? 'open' : ''}`} key={key}>
            {group.title && (
              <button type="button" className="nav-group-toggle" onClick={() => toggleGroup(key)}>
                <span>{group.title}</span>
                <ArrowRight size={14} />
              </button>
            )}
            {isOpen && (
              <div className="nav-group-items">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return <button type="button" key={item.id} className={screen === item.id ? 'active' : ''} onClick={() => setScreen(item.id)}><Icon size={17} /> {item.label}</button>;
                })}
              </div>
            )}
          </div>
          );
        })}
      </nav>
      <button type="button" className="logout" onClick={onLogout}><LogOut size={17} /> Chiqish</button>
    </aside>
  );
}

function Topbar({ role, setScreen, studentProfile, currentUserEmail, messages }) {
  const initial = studentProfile.fullName?.trim()?.[0]?.toUpperCase() || 'O';
  const unreadCount = role === 'admin'
    ? messages.filter((item) => item.to === 'admin' && !item.readByAdmin).length
    : messages.filter((item) => item.to === currentUserEmail && !item.readByUser).length;
  return (
    <header className="topbar">
      <div><b>{role === 'admin' ? 'Admin panel' : `Salom, ${studentProfile.fullName}!`}</b><span>O'qishni boshlashga tayyor.</span></div>
      <div className="top-actions">
        <Search size={18} />
        <button type="button" className="icon-btn badge-button" onClick={() => setScreen('notifications')}><Bell size={17} />{unreadCount > 0 && <i>{unreadCount}</i>}</button>
        <button type="button" className="avatar" onClick={() => setScreen(role === 'admin' ? 'admin' : 'profile')}>{initial}</button>
      </div>
    </header>
  );
}

function DashboardPage({ setScreen, setSelectedDirection, directionAccess, lessonAccess, directionLessons, completedDirections, directions }) {
  const openCount = directions.filter((item) => directionAccess[item.title]).length;
  const unlockedLessons = directions.reduce((total, item) => total + (directionAccess[item.title] ? getUnlockedLessonCount(lessonAccess, item.title, directionLessons[item.title] || []) : 0), 0);
  const totalLessons = directions.reduce((total, item) => total + (directionLessons[item.title] || []).length, 0);
  const progress = totalLessons ? Math.round((unlockedLessons / totalLessons) * 100) : 0;
  const dynamicDirections = directions.map((item) => ({
    ...item,
    progress: getDirectionProgress(directionAccess, lessonAccess, completedDirections, item.title, directionLessons[item.title] || []),
  }));
  return (
    <section className="panel">
      <div className="dashboard-head">
        <div><h2>Umumiy progress</h2><div className="progress"><i style={{ width: `${progress}%` }} /></div></div>
        <Stat value={openCount} label="Ochiq yo'nalishlar" />
        <Stat value={unlockedLessons} label="Ochiq mavzular" />
        <Stat value={completedDirections.length} label="Tugallangan yo'nalishlar" />
      </div>
      <Title title="Yo'nalishlar" action={<button className="ghost small" onClick={() => setScreen('directions')}><Eye size={15} /> Barchasini ko'rish</button>} />
      <DirectionGrid directions={dynamicDirections} directionAccess={directionAccess} onOpen={(title) => { setSelectedDirection(title); setScreen('course'); }} />
    </section>
  );
}

function DirectionsPage({ setScreen, setSelectedDirection, directionAccess, lessonAccess, directionLessons, completedDirections, directions }) {
  const dynamicDirections = directions.map((item) => ({
    ...item,
    progress: getDirectionProgress(directionAccess, lessonAccess, completedDirections, item.title, directionLessons[item.title] || []),
  }));
  return (
    <section className="panel">
      <Title title="Yo'nalishlar" subtitle="O'zingizga qiziq yo'nalishni tanlang va o'qishni boshlang." />
      <DirectionGrid large directions={dynamicDirections} directionAccess={directionAccess} onOpen={(title) => { setSelectedDirection(title); setScreen('course'); }} />
    </section>
  );
}

function CoursesPage({ setScreen, setSelectedDirection, directionAccess, lessonAccess, directionLessons, completedDirections, directions }) {
  return (
    <section className="panel">
      <Title title="Mening o'quvlarim" subtitle="Kurslar hali boshlanmagan. Birinchi darsdan boshlashingiz mumkin." />
      <div className="course-list">
        {directions.map((item) => {
          const Icon = item.icon;
          const open = Boolean(directionAccess[item.title]);
          const list = directionLessons[item.title] || [];
          const unlocked = getUnlockedLessonCount(lessonAccess, item.title, list);
          const progress = getDirectionProgress(directionAccess, lessonAccess, completedDirections, item.title, list);
          return (
            <article key={item.title}>
              <Icon size={30} />
              <div>
                <h3>{item.title}</h3>
                <p>{open ? `Ochiq mavzu: ${unlocked}. ${list[unlocked - 1] || 'Mavzu kiritilmagan'}` : 'Oldingi yo\'nalish tugagach yoki admin ochgach ishlaydi'}</p>
                <div className="progress"><i style={{ width: `${progress}%` }} /></div>
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
        const progress = Number(item.progress) || 0;
        return (
          <button className="direction-card" key={item.title} disabled={!isOpen} aria-disabled={!isOpen} onClick={() => isOpen && onOpen(item.title)}>
            <Icon size={42} style={{ color: item.color }} />
            {!isOpen && <Lock className="lock" size={22} />}
            <b>{item.title}</b>
            <small>{isOpen ? 'Ochiq' : 'Qulflangan'}</small>
            <span className="progress"><i style={{ width: `${progress}%`, background: item.color }} /></span>
            <em>{progress}%</em>
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
  const progress = courseLessons.length ? Math.round((unlockedLessonCount / courseLessons.length) * 100) : 0;

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
        <div className="progress"><i style={{ width: `${progress}%` }} /></div>
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

function TheoryPage({ setScreen, selectedDirection, selectedLesson, courseLessons, lessonContents, questions }) {
  const lesson = courseLessons[selectedLesson] || courseLessons[0];
  const content = getLessonContent(lessonContents, selectedDirection, lesson) || {
    title: lesson,
    text: 'Bu mavzu uchun nazariy dars hali kiritilmagan. Admin panel orqali dars matni qo\'shing.',
    videoUrl: '',
    codeSnippet: '',
  };

  const codeSnippet = content.codeSnippet || getDefaultCodeSnippet(selectedDirection, lesson);
  const ytUrl = getYouTubeEmbedUrl(content.videoUrl);
  const theoryQuestions = getQuestions(questions, selectedDirection, lesson, 'theory');

  return (
    <section className="panel lesson-page rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-md p-6 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">{selectedLesson + 1}. {lesson}</h2>
          <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider mt-1 block">1-qism: Nazariy dars</span>
        </div>
        <button
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all duration-200"
          onClick={() => setScreen('practice')}
        >
          Keyingi: Amaliyot <ArrowRight size={16} />
        </button>
      </div>

      <StageTabs active="theory" setScreen={setScreen} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
        <div className="flex flex-col gap-6">
          {content.videoUrl ? (
            ytUrl ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 group">
                <iframe
                  className="absolute top-0 left-0 w-full h-full border-0"
                  src={ytUrl}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 p-1 flex items-center justify-center">
                <video className="w-full h-full object-cover rounded-lg" src={content.videoUrl} controls />
              </div>
            )
          ) : (
            <div className="relative w-full aspect-video rounded-xl border border-slate-850 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex flex-col items-center justify-center gap-4 text-center p-6 shadow-xl overflow-hidden group transition-all duration-300 hover:border-blue-500/25">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.06),transparent)]"></div>
              <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/15 text-blue-400 group-hover:scale-105 transition-transform duration-300">
                <Code2 size={28} />
              </div>
              <div>
                <h4 className="text-slate-200 font-bold text-base tracking-wide group-hover:text-blue-400 transition-colors duration-300">{lesson}</h4>
                <p className="text-slate-400 text-xs mt-1 max-w-[260px] mx-auto leading-relaxed">Ushbu dars uchun video darslik havola qilinmagan. Quyidagi nazariy materialni o'rganing.</p>
              </div>
            </div>
          )}

          <div className="bg-slate-950/60 rounded-xl p-5 border border-slate-850/80">
            <h4 className="text-slate-300 font-bold text-sm tracking-wider uppercase mb-3 flex items-center gap-2">
              <Code2 size={16} className="text-emerald-400" />
              Tavsiya etilgan kod namunasi
            </h4>
            <pre className="p-4 bg-slate-950 text-emerald-400 rounded-lg border border-slate-800 font-mono text-sm leading-relaxed overflow-auto max-h-[300px] shadow-inner">{codeSnippet}</pre>
          </div>
        </div>

        <article className="prose prose-invert max-w-none bg-slate-950/30 rounded-xl border border-slate-850 p-6 flex flex-col justify-between">
          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
              <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
              {content.title}
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{content.text}</p>
            {content.videoUrl && !ytUrl && (
              <p className="mt-2">
                <a
                  href={content.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 underline"
                >
                  Video darsni alohida oynada ochish
                </a>
              </p>
            )}
          </div>

          <button
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 font-bold text-sm tracking-wide mt-6 transition-all duration-200"
            onClick={() => setScreen('practice')}
          >
            Keyingi qadam: Amaliy topshiriq <ArrowRight size={16} />
          </button>
        </article>
      </div>
      {theoryQuestions.length > 0 && (
        <div className="theory-question-list">
          <h3>Nazariy savollar</h3>
          {theoryQuestions.map((item, index) => (
            <article key={item.id || `${item.question}-${index}`}>
              <b>{index + 1}. {item.question}</b>
              {item.theoryAnswer && <p>{item.theoryAnswer}</p>}
            </article>
          ))}
        </div>
      )}
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

function getCodeLanguage(direction) {
  const text = String(direction || '').toLowerCase();
  if (text.includes('python')) return 'python';
  return 'python';
}

async function checkCodeOnServer({ code, direction, checkWords }) {
  return apiRequest('/code/check', {
    method: 'POST',
    body: JSON.stringify({
      code,
      language: getCodeLanguage(direction),
      checkWords,
    }),
  });
}

function PracticePage({ setScreen, questions, selectedDirection, selectedLesson, courseLessons, setResult }) {
  const lesson = getCurrentLesson(courseLessons, selectedLesson);
  const tasks = getQuestions(questions, selectedDirection, lesson, 'practice');
  const [taskIndex, setTaskIndex] = useState(0);
  const task = tasks[taskIndex] || starterQuestions[1];
  const [code, setCode] = useState(task.code || '');
  const [message, setMessage] = useState('');
  const [output, setOutput] = useState('');
  const [checking, setChecking] = useState(false);
  const [solved, setSolved] = useState({});

  useEffect(() => {
    setTaskIndex(0);
    setSolved({});
  }, [lesson, selectedDirection, tasks.length]);

  useEffect(() => {
    setCode(task.code || '');
    setMessage('');
    setOutput('');
  }, [task.id, taskIndex]);

  const fileDetails = useMemo(() => {
    const dir = String(selectedDirection || '').toLowerCase();
    if (dir.includes('python')) return { ext: '.py', accept: '.py,.txt', label: 'Fayl yuklash (.py)' };
    if (dir.includes('arduino') || dir.includes('esp32')) return { ext: '.ino', accept: '.ino,.cpp,.txt', label: 'Fayl yuklash (.ino)' };
    if (dir.includes('web') || dir.includes('html') || dir.includes('javascript')) return { ext: '.html', accept: '.html,.css,.js,.txt', label: 'Fayl yuklash (.html)' };
    return { ext: '.txt', accept: '.txt', label: 'Fayl yuklash (.txt)' };
  }, [selectedDirection]);

  async function check() {
    setChecking(true);
    setOutput('');
    const checkWords = task.checkWords?.length ? task.checkWords : [];
    try {
      const result = await checkCodeOnServer({ code, direction: selectedDirection, checkWords });
      const ok = Boolean(result.ok);
      const nextSolved = { ...solved, [task.id]: ok };
      const correct = Object.values(nextSolved).filter(Boolean).length;
      const total = Math.max(tasks.length, 1);
      setMessage(result.message || (ok ? 'Yechim qabul qilindi.' : 'Yechimda kerakli qismlar yetishmayapti.'));
      setOutput([result.stdout, result.stderr].filter(Boolean).join('\n'));
      setSolved(nextSolved);
      setResult({ percent: Math.round((correct / total) * 100), correct, wrong: total - correct, score: Math.round((correct / total) * 100) });
    } catch (error) {
      setMessage(error.message || 'Kod tekshirishda xato yuz berdi.');
    } finally {
      setChecking(false);
    }
  }

  async function uploadCode(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedExtensions = fileDetails.accept.split(',').map((item) => item.trim().toLowerCase());
    const fileName = file.name.toLowerCase();
    if (file.size > 128 * 1024 || !allowedExtensions.some((ext) => fileName.endsWith(ext))) {
      setMessage('Fayl turi yoki hajmi ruxsat etilmagan.');
      event.target.value = '';
      return;
    }
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
      {output && <pre className="execution-output">{output}</pre>}
      <div className="actions end">
        <button className="ghost" disabled={taskIndex === 0} onClick={() => setTaskIndex((index) => index - 1)}><ArrowRight className="flip-icon" size={18} /> Oldingi</button>
        <button className="ghost" disabled={taskIndex >= tasks.length - 1} onClick={() => setTaskIndex((index) => index + 1)}><ArrowRight size={18} /> Keyingi topshiriq</button>
        <label className="file-button ghost"><FileCode size={18} /> {fileDetails.label}<input type="file" accept={fileDetails.accept} onChange={uploadCode} /></label>
        <button className="primary" disabled={checking} onClick={check}><ClipboardCheck size={18} /> {checking ? 'Tekshirilmoqda...' : 'Yechimni tekshirish'}</button>
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

function FinalTaskPage({ setScreen, questions, selectedDirection, selectedLesson, setSelectedLesson, courseLessons, setResult, setLessonAccess }) {
  const lesson = getCurrentLesson(courseLessons, selectedLesson);
  const finalTasks = getQuestions(questions, selectedDirection, lesson, 'final');
  const task = finalTasks[0] || {
    question: 'Oddiy kontakt daftar dasturini yozing. Foydalanuvchidan ism va yosh so\'rang, keyin natijani chiroyli ko\'rinishda chiqaring.',
    code: '# Kodi shu yerga yozing\nism = input("Ism: ")\nyosh = input("Yosh: ")\nprint(ism, yosh)',
    checkWords: ['input', 'print'],
  };
  const [code, setCode] = useState(task.code || '# Kodi shu yerga yozing');
  const [message, setMessage] = useState('');
  const [output, setOutput] = useState('');
  const [checking, setChecking] = useState(false);
  const [completed, setCompleted] = useState(false);
  const hasNextLesson = selectedLesson < courseLessons.length - 1;

  useEffect(() => {
    setCode(task.code || '# Kodi shu yerga yozing');
    setMessage('');
    setOutput('');
    setCompleted(false);
  }, [task.id, task.code]);

  async function submit() {
    setChecking(true);
    setOutput('');
    const checkWords = task.checkWords?.length ? task.checkWords : ['input', 'print'];
    try {
      const result = await checkCodeOnServer({ code, direction: selectedDirection, checkWords });
      const ok = Boolean(result.ok);
      const openedNext = ok ? unlockNextLesson(setLessonAccess, selectedDirection, selectedLesson, courseLessons) : false;
      setMessage(ok ? (openedNext ? 'Mavzu tugadi. Keyingi mavzu ochildi.' : 'Mavzu tugadi. Yakuniy imtihonga o\'tishingiz mumkin.') : (result.message || `Topshiriqda quyidagilar ishlatilishi kerak: ${checkWords.join(', ')}.`));
      setOutput([result.stdout, result.stderr].filter(Boolean).join('\n'));
      setResult({ percent: ok ? 90 : 50, correct: ok ? 23 : 12, wrong: ok ? 2 : 13, score: ok ? 90 : 50 });
      setCompleted(ok);
    } catch (error) {
      setMessage(error.message || 'Kod tekshirishda xato yuz berdi.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="panel lesson-page">
      <h2>{selectedLesson + 1}. {lesson}</h2>
      <p>4-qism: Yakuniy topshiriq</p>
      <StageTabs active="final" setScreen={setScreen} />
      <div className="practice-grid">
        <div><h3>Loyiha topshirig'i</h3><p>{task.question}</p></div>
        <textarea className="code-editor" value={code} onChange={(event) => setCode(event.target.value)} />
      </div>
      {message && <div className="notice"><CheckCircle2 size={18} /> {message}</div>}
      {output && <pre className="execution-output">{output}</pre>}
      <div className="actions">
        <button className="primary" disabled={checking} onClick={submit}><ClipboardCheck size={18} /> {checking ? 'Tekshirilmoqda...' : 'Topshirish'}</button>
        {completed && hasNextLesson && (
          <button className="success-btn" onClick={() => { setSelectedLesson(selectedLesson + 1); setScreen('theory'); }}><ArrowRight size={18} /> Keyingi mavzuga o'tish</button>
        )}
        {completed && !hasNextLesson && (
          <button className="success-btn" onClick={() => setScreen('exam')}><Trophy size={18} /> Yakuniy imtihonga o'tish</button>
        )}
      </div>
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

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function downloadCertificate(direction, studentProfile) {
  const html = `<!doctype html><html><head><meta charset="UTF-8"><title>Sertifikat</title><style>body{font-family:Arial,sans-serif;padding:48px;text-align:center;color:#132341}.certificate{border:8px double #d7b45c;min-height:420px;padding:60px}h1{font-size:42px}h2{font-size:34px;color:#0f2f65}.seal{width:74px;height:74px;margin:30px auto 0;display:grid;place-items:center;border:2px solid #1f4f91;border-radius:50%;font-weight:900}</style></head><body><section class="certificate"><h1>SERTIFIKAT</h1><p>Ushbu sertifikat</p><h2>${escapeHtml(studentProfile.fullName)}</h2><p>${escapeHtml(direction)} yo'nalishini muvaffaqiyatli yakunlagani uchun berildi.</p><div class="seal">360</div></section></body></html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sertifikat.html';
  link.click();
  URL.revokeObjectURL(url);
}

function CertificatePage({ selectedDirection, result, studentProfile }) {
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
        <h2>{studentProfile.fullName}</h2>
        <p>{selectedDirection} yo'nalishini muvaffaqiyatli yakunlagani uchun berildi.</p>
        <div className="seal">360</div>
      </div>
      <div className="actions certificate-actions">
        <button className="success-btn" onClick={() => downloadCertificate(selectedDirection, studentProfile)}><Download size={17} /> Yuklab olish</button>
        <button className="ghost" onClick={() => window.print()}><Printer size={17} /> Chop etish</button>
      </div>
    </section>
  );
}

function ProfilePage({ studentProfile, setStudentProfile }) {
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', nextPassword: '', confirmPassword: '' });
  const [passwordMessage, setPasswordMessage] = useState('');

  function updateProfile(field, value) {
    setStudentProfile((current) => ({ ...current, [field]: value }));
  }

  function updatePasswordField(field, value) {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  }

  async function changePassword() {
    setPasswordMessage('');
    if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('Yangi parol tasdig‘i mos emas.');
      return;
    }
    try {
      const result = await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          nextPassword: passwordForm.nextPassword,
        }),
      });
      setPasswordMessage(result.message || 'Parol yangilandi.');
      setPasswordForm({ currentPassword: '', nextPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordMessage(error.message || 'Parolni yangilab bo‘lmadi.');
    }
  }

  return (
    <section className="panel profile-grid">
      <div className="big-avatar">{studentProfile.fullName?.trim()?.[0]?.toUpperCase() || 'O'}</div>
      <div><h2>{studentProfile.fullName}</h2><p>{studentProfile.email}</p><p>{studentProfile.roleLabel}</p></div>
      <div className="profile-form">
        <label>To'liq ism<input value={studentProfile.fullName} onChange={(event) => updateProfile('fullName', event.target.value)} /></label>
        <label>Email<input value={studentProfile.email} onChange={(event) => updateProfile('email', event.target.value)} /></label>
        <label>Telefon<input value={studentProfile.phone} onChange={(event) => updateProfile('phone', event.target.value)} /></label>
        <label>Tug'ilgan sana<input value={studentProfile.birthDate} onChange={(event) => updateProfile('birthDate', event.target.value)} /></label>
      </div>
      <div className="profile-form password-panel">
        <h3>Parolni o'zgartirish</h3>
        <label>Hozirgi parol<input type="password" value={passwordForm.currentPassword} onChange={(event) => updatePasswordField('currentPassword', event.target.value)} /></label>
        <label>Yangi parol<input type="password" value={passwordForm.nextPassword} onChange={(event) => updatePasswordField('nextPassword', event.target.value)} /></label>
        <label>Yangi parolni tasdiqlash<input type="password" value={passwordForm.confirmPassword} onChange={(event) => updatePasswordField('confirmPassword', event.target.value)} /></label>
        {passwordMessage && <div className="notice"><InfoIcon size={18} /> {passwordMessage}</div>}
        <button className="primary" onClick={changePassword}><Save size={18} /> Parolni yangilash</button>
      </div>
    </section>
  );
}

function renameUserKey(users, oldEmail, nextEmail, updates = {}) {
  const normalizedOld = normalizeEmail(oldEmail);
  const normalizedNext = normalizeEmail(nextEmail);
  const user = users[normalizedOld];
  if (!user || !normalizedNext) return users;
  const { [normalizedOld]: _removed, ...rest } = users;
  return {
    ...rest,
    [normalizedNext]: {
      ...user,
      ...updates,
      email: normalizedNext,
      profile: { ...user.profile, ...updates.profile, email: normalizedNext },
    },
  };
}

function updateMessageUser(messages, oldEmail, nextEmail) {
  const normalizedOld = normalizeEmail(oldEmail);
  const normalizedNext = normalizeEmail(nextEmail);
  return messages.map((item) => ({
    ...item,
    from: item.from === normalizedOld ? normalizedNext : item.from,
    to: item.to === normalizedOld ? normalizedNext : item.to,
  }));
}

function getUnreadForUser(messages, userEmail) {
  return messages.filter((item) => item.from === userEmail && item.to === 'admin' && !item.readByAdmin).length;
}

function NotificationsPage({ role, currentUserEmail, users, messages, setMessages }) {
  const userList = Object.values(users);
  const [selectedEmail, setSelectedEmail] = useState(role === 'admin' ? '' : currentUserEmail || userList[0]?.email || '');
  const [text, setText] = useState('');
  const isAdmin = role === 'admin';
  const activeEmail = isAdmin ? selectedEmail : currentUserEmail;
  const activeUser = users[activeEmail];
  const conversation = messages
    .filter((item) => (item.from === activeEmail && item.to === 'admin') || (item.from === 'admin' && item.to === activeEmail))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  useEffect(() => {
    if (!isAdmin) return;
    if (selectedEmail && !users[selectedEmail]) setSelectedEmail('');
  }, [isAdmin, selectedEmail, users]);

  useEffect(() => {
    if (!activeEmail) return;
    if (isAdmin) {
      setMessages((current) => current.map((item) => (
        item.from === activeEmail && item.to === 'admin' ? { ...item, readByAdmin: true } : item
      )));
      return;
    }
    setMessages((current) => current.map((item) => (
      item.from === 'admin' && item.to === activeEmail ? { ...item, readByUser: true } : item
    )));
  }, [activeEmail, isAdmin, setMessages]);

  function sendMessage() {
    const body = text.trim();
    if (!body || !activeEmail) return;
    setMessages((current) => [
      ...current,
      {
        id: createId(),
        from: isAdmin ? 'admin' : activeEmail,
        to: isAdmin ? activeEmail : 'admin',
        text: body,
        readByAdmin: isAdmin,
        readByUser: !isAdmin,
        createdAt: new Date().toISOString(),
      },
    ]);
    setText('');
  }

  return (
    <section className="panel messages-page">
      <Title title={isAdmin ? 'User xabarlari' : 'Adminga xabar'} subtitle={isAdmin ? 'Userni tanlang va javob yozing.' : 'Savolingizni adminga yuboring.'} />
      <div className={`messages-layout ${isAdmin ? '' : 'single'}`}>
        {isAdmin && (
          <aside className="message-users">
            {userList.map((user) => {
              const unread = getUnreadForUser(messages, user.email);
              return (
                <button key={user.email} className={selectedEmail === user.email ? 'active' : ''} onClick={() => setSelectedEmail(user.email)}>
                  <span>{user.profile?.fullName || user.email}</span>
                  <small>{user.email}</small>
                  {unread > 0 && <b>{unread}</b>}
                </button>
              );
            })}
          </aside>
        )}
        {(!isAdmin || selectedEmail) ? <div className="message-thread">
          <div className="message-thread-head">
            <div className="mini-avatar">{isAdmin ? (activeUser?.profile?.fullName?.[0] || 'U') : 'A'}</div>
            <div>
              <h3>{isAdmin ? activeUser?.profile?.fullName || 'User tanlanmagan' : 'Admin bilan suhbat'}</h3>
              <small>{isAdmin ? activeUser?.email : 'Savollaringizga admin javob beradi'}</small>
            </div>
          </div>
          <div className="message-list">
            {conversation.length ? conversation.map((item) => (
              <article key={item.id} className={item.from === 'admin' ? 'admin-message' : 'user-message'}>
                <b>{item.from === 'admin' ? 'Admin' : users[item.from]?.profile?.fullName || item.from}</b>
                <p>{item.text}</p>
                <small>{new Date(item.createdAt).toLocaleString()}</small>
              </article>
            )) : (
              <div className="notification"><Bell size={18} /><span>Hozircha xabar yo'q.</span><small>Suhbat boshlanmagan</small></div>
            )}
          </div>
          <div className="message-compose">
            <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={isAdmin ? 'Userga javob yozing...' : 'Adminga xabar yozing...'} />
            <button className="primary" onClick={sendMessage}><Save size={18} /> Yuborish</button>
          </div>
        </div> : (
          <div className="message-empty-state">
            <Bell size={34} />
            <h3>Userni tanlang</h3>
            <p>Chapdagi ro'yxatdan user ustiga bosing. Shundan keyin yozish paneli ochiladi.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function AdminDashboard({ questions, directionAccess, lessonAccess, directionLessons, completedDirections, directions, setScreen, databaseStatus, saveStatus, studentProfile, users }) {
  const userList = Object.values(users);
  const openDirections = directions.filter((item) => directionAccess[item.title]).length;
  const currentDirection = directions.find((item) => directionAccess[item.title] && !completedDirections.includes(item.title))?.title || directions[0].title;
  const courseLessons = directionLessons[currentDirection] || [];
  const currentLessonCount = getUnlockedLessonCount(lessonAccess, currentDirection, courseLessons);
  const totalLessons = Object.values(directionLessons).reduce((total, list) => total + list.length, 0);

  return (
    <section className="panel admin-home">
      <Title title="Boshqaruv paneli" subtitle="Avval yo'nalish qo'shing, keyin mavzu, dars, test va ruxsatlarni shu tartibda boshqaring." />
      <div className={`notice db-status ${databaseStatus === 'connected' ? 'connected' : ''}`}>
        <CheckCircle2 size={18} />
        {databaseStatus === 'connected'
          ? `PostgreSQL bazaga ulangan. ${saveStatus === 'saving' ? 'Saqlanmoqda...' : 'Oxirgi oʼzgarish saqlandi.'}`
          : databaseStatus === 'checking'
            ? 'Baza aloqasi tekshirilmoqda.'
            : 'Backend yoki PostgreSQL ulanmagan. Oʼzgarishlar lokal saqlanadi va backend qaytsa DBga yuboriladi.'}
      </div>
      <div className="admin-stats">
        <Stat value={directions.length} label="Jami yo'nalishlar" />
        <Stat value={userList.length} label="Jami userlar" />
        <Stat value={openDirections} label="Ochiq yo'nalishlar" />
        <Stat value={questions.length} label="Test va nazoratlar" />
      </div>

      <div className="admin-dashboard-grid">
        <div className="admin-guide">
          <h3>Ish tartibi</h3>
          <button onClick={() => setScreen('admin-directions')}><Rocket size={18} /><span>1. Yo'nalish qo'shish</span><small>Python, Arduino yoki yangi kurs nomi</small></button>
          <button onClick={() => setScreen('admin-topic')}><Plus size={18} /><span>2. Mavzu qo'shish</span><small>Tanlangan yo'nalish ichiga dars mavzulari</small></button>
          <button onClick={() => setScreen('admin-lesson')}><BookOpen size={18} /><span>3. Dars qo'shish</span><small>Nazariya matni va video havolasi</small></button>
          <button onClick={() => setScreen('admin-theory-questions')}><ClipboardCheck size={18} /><span>4. Nazariy savol-javob</span><small>Nazariya sahifasida alohida ko'rinadi</small></button>
          <button onClick={() => setScreen('admin-test-questions')}><FileQuestion size={18} /><span>5. Test qo'shish</span><small>Mavzu bo'yicha variantli test</small></button>
          <button onClick={() => setScreen('admin-code-tasks')}><Code2 size={18} /><span>6. Kod yozish qismi</span><small>Amaliy dastur yozish topshirig'i</small></button>
          <button onClick={() => setScreen('admin-final-tasks')}><Award size={18} /><span>7. Yakuniy quiz va dastur</span><small>Yo'nalish tugaganda ishlaydi</small></button>
          <button onClick={() => setScreen('admin-access')}><ShieldCheck size={18} /><span>8. Ruxsatlar</span><small>O'quvchi qaysi mavzugacha kirishini belgilang</small></button>
        </div>

        <div className="student-track">
          <h3>Joriy o'quvchi</h3>
          <p><span className="mini-avatar">{studentProfile.fullName?.trim()?.[0]?.toUpperCase() || 'O'}</span>{studentProfile.fullName}</p>
          <small>Joriy yo'nalish: {currentDirection}</small>
          <small>Ochiq mavzu: {currentLessonCount}. {courseLessons[currentLessonCount - 1] || 'Mavzu kiritilmagan'}</small>
          <small>Tugagan yo'nalishlar: {completedDirections.length}</small>
          <button className="ghost small" onClick={() => setScreen('admin-access')}><ShieldCheck size={15} /> Ruxsatlarni boshqarish</button>
          <button className="ghost small" onClick={() => setScreen('admin-users')}><Users size={15} /> Userlarni boshqarish</button>
          <div className="mini-user-list">
            {userList.map((user) => (
              <span key={user.email}>{user.profile?.fullName || user.email}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminUsers({ users, setUsers, messages, setMessages, currentUserEmail, setCurrentUserEmail, setStudentProfile }) {
  const userList = Object.values(users);
  const [selectedEmail, setSelectedEmail] = useState(userList[0]?.email || '');
  const selectedUser = users[selectedEmail] || userList[0];
  const [form, setForm] = useState({
    fullName: selectedUser?.profile?.fullName || '',
    email: selectedUser?.email || '',
    phone: selectedUser?.profile?.phone || '',
    birthDate: selectedUser?.profile?.birthDate || '',
    nextPassword: '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const user = users[selectedEmail] || Object.values(users)[0];
    if (!user) return;
    if (!users[selectedEmail]) setSelectedEmail(user.email);
    setForm({
      fullName: user.profile?.fullName || '',
      email: user.email || '',
      phone: user.profile?.phone || '',
      birthDate: user.profile?.birthDate || '',
      nextPassword: '',
    });
  }, [selectedEmail, users]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function saveUser() {
    const nextEmail = normalizeEmail(form.email);
    if (!selectedUser || !nextEmail || !form.fullName.trim()) {
      setMessage("Ism va login/email bo'sh bo'lmasin.");
      return;
    }
    if (nextEmail !== selectedEmail && users[nextEmail]) {
      setMessage('Bu login/email boshqa userda bor.');
      return;
    }

    const updates = {
      profile: {
        ...selectedUser.profile,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        birthDate: form.birthDate.trim(),
      },
    };

    setUsers((current) => renameUserKey(current, selectedEmail, nextEmail, updates));
    setMessages(updateMessageUser(messages, selectedEmail, nextEmail));
    if (currentUserEmail === selectedEmail) {
      setCurrentUserEmail(nextEmail);
      setStudentProfile((current) => ({ ...current, ...updates.profile, email: nextEmail }));
    }
    setSelectedEmail(nextEmail);
    setMessage('User maʼlumotlari saqlandi.');
  }

  return (
    <section className="panel form-panel">
      <Title title="Userlarni boshqarish" subtitle="Admin user login, parol va profil maʼlumotlarini koʼradi hamda oʼzgartiradi." />
      <div className="access-grid">
        <div className="user-admin-list">
          {userList.map((user) => (
            <button key={user.email} className={selectedEmail === user.email ? 'active' : ''} onClick={() => setSelectedEmail(user.email)}>
              <b>{user.profile?.fullName || user.email}</b>
              <small>{user.email}</small>
              <span>Rol: {user.role || 'student'}</span>
            </button>
          ))}
        </div>
        <div>
          <label>To'liq ism<input value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} /></label>
          <label>Login / Email<input value={form.email} onChange={(event) => updateField('email', event.target.value)} /></label>
          <label>Telefon<input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} /></label>
          <label>Tug'ilgan sana<input value={form.birthDate} onChange={(event) => updateField('birthDate', event.target.value)} /></label>
          <label>Yangi parol<input type="password" value={form.nextPassword} onChange={(event) => updateField('nextPassword', event.target.value)} placeholder="Kamida 8 belgi" /></label>
          {message && <div className="notice"><CheckCircle2 size={18} /> {message}</div>}
          <div className="actions">
            <button className="primary" onClick={saveUser}><Save size={18} /> Saqlash</button>
            <button
              className="ghost"
              onClick={async () => {
                const targetEmail = normalizeEmail(form.email || selectedEmail);
                if (!targetEmail || form.nextPassword.length < 8) {
                  setMessage('Yangi parol kamida 8 belgidan iborat bo‘lsin.');
                  return;
                }
                try {
                  const result = await apiRequest('/admin/users/password', {
                    method: 'POST',
                    body: JSON.stringify({ email: targetEmail, nextPassword: form.nextPassword }),
                  });
                  setForm((current) => ({ ...current, nextPassword: '' }));
                  setMessage(result.message || 'User paroli yangilandi.');
                } catch (error) {
                  setMessage(error.message || 'User parolini yangilab bo‘lmadi.');
                }
              }}
            ><Lock size={18} /> Parolni yangilash</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminAccess({ directionLessons, directions, users, setUsers, currentUserEmail, setDirectionAccess, setLessonAccess, setCompletedDirections }) {
  const userList = Object.values(users);
  const [selectedEmail, setSelectedEmail] = useState(userList[0]?.email || '');
  const [direction, setDirection] = useState(directions[0].title);
  const selectedUser = users[selectedEmail] || userList[0];
  const userDirectionAccess = selectedUser?.directionAccess || initialDirectionAccess;
  const userLessonAccess = selectedUser?.lessonAccess || initialLessonAccess;
  const userCompletedDirections = selectedUser?.completedDirections || [];
  const courseLessons = directionLessons[direction] || [];
  const selectedDirectionIndex = directions.findIndex((item) => item.title === direction);
  const isFirstDirection = selectedDirectionIndex === 0;
  const isOpen = Boolean(userDirectionAccess[direction]);
  const unlockedLessonCount = getUnlockedLessonCount(userLessonAccess, direction, courseLessons);
  const nextDirection = getNextDirection(directions, direction);

  useEffect(() => {
    if (!users[selectedEmail] && userList[0]?.email) setSelectedEmail(userList[0].email);
  }, [selectedEmail, userList, users]);

  function updateSelectedUser(updater) {
    if (!selectedUser) return;
    setUsers((current) => {
      const currentUser = current[selectedEmail];
      const nextUser = updater(currentUser);
      return { ...current, [selectedEmail]: nextUser };
    });
  }

  function syncCurrentUser(nextUser) {
    if (selectedEmail !== currentUserEmail) return;
    setDirectionAccess(nextUser.directionAccess || initialDirectionAccess);
    setLessonAccess(nextUser.lessonAccess || initialLessonAccess);
    setCompletedDirections(nextUser.completedDirections || []);
  }

  function toggleDirection() {
    if (isFirstDirection && isOpen) return;
    updateSelectedUser((user) => {
      const nextUser = {
        ...user,
        directionAccess: { ...(user.directionAccess || initialDirectionAccess), [direction]: !isOpen },
        lessonAccess: { ...(user.lessonAccess || initialLessonAccess), [direction]: user.lessonAccess?.[direction] || 1 },
      };
      syncCurrentUser(nextUser);
      return nextUser;
    });
  }

  function setOpenLessons(count) {
    updateSelectedUser((user) => {
      const nextUser = {
        ...user,
        lessonAccess: { ...(user.lessonAccess || initialLessonAccess), [direction]: clampLessonCount(count, courseLessons) },
        directionAccess: { ...(user.directionAccess || initialDirectionAccess), [direction]: true },
      };
      syncCurrentUser(nextUser);
      return nextUser;
    });
  }

  return (
    <section className="panel form-panel">
      <Title title="Ruxsatlarni boshqarish" subtitle="Admin o'quvchiga yo'nalish va mavzularni qo'lda ochib beradi. Yo'nalish tugasa keyingisi avtomatik ochiladi." />
      <div className="access-grid">
        <div>
          <label>O'quvchi<select value={selectedEmail} onChange={(event) => setSelectedEmail(event.target.value)}>{userList.map((user) => <option key={user.email} value={user.email}>{user.profile?.fullName || user.email}</option>)}</select></label>
          <label>Yo'nalish<select value={direction} onChange={(event) => setDirection(event.target.value)}>{directions.map((item) => <option key={item.title}>{item.title}</option>)}</select></label>
          <div className="access-summary">
            <span className={`status-pill ${isOpen ? 'open' : ''}`}>{isOpen ? 'Ochiq' : 'Yopiq'}</span>
            <b>Ochiq mavzu: {unlockedLessonCount}. {courseLessons[unlockedLessonCount - 1]}</b>
            <small>{userCompletedDirections.includes(direction) ? 'Bu yo\'nalish yakunlangan.' : nextDirection ? `Yakunlansa keyingi yo'nalish ochiladi: ${nextDirection}` : 'Bu oxirgi yo\'nalish.'}</small>
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

function AdminDirections({ directions, setDirections, setDirectionAccess, setLessonAccess, setDirectionLessons, setSelectedDirection, setUsers }) {
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
    setUsers((current) => Object.fromEntries(Object.entries(current).map(([email, user]) => [
      email,
      {
        ...user,
        directionAccess: { ...(user.directionAccess || initialDirectionAccess), [title]: false },
        lessonAccess: { ...(user.lessonAccess || initialLessonAccess), [title]: 1 },
      },
    ])));
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

function AdminTheoryQuestions({ questions, setQuestions, directions, directionLessons }) {
  const [message, setMessage] = useState('');
  const [direction, setDirection] = useState(directions[0]?.title || '');
  const [topic, setTopic] = useState((directionLessons[directions[0]?.title] || lessons)[0] || '');
  const [question, setQuestion] = useState('');
  const [theoryAnswer, setTheoryAnswer] = useState('');

  const theoryQuestions = questions.filter((item) => item.section === 'theory');

  function selectDirection(value) {
    const topics = directionLessons[value] || [];
    setDirection(value);
    setTopic(topics[0] || '');
  }

  function saveTheoryQuestion() {
    const text = question.trim();
    if (!direction || !topic || !text) {
      setMessage("Yo'nalish, mavzu va nazariy savolni to'ldiring.");
      return;
    }

    const item = {
      id: createId(),
      direction,
      topic,
      section: 'theory',
      question: text,
      theoryAnswer: theoryAnswer.trim(),
      answers: [],
      correct: 0,
      points: 0,
    };

    setQuestions((current) => [...current, item]);
    setQuestion('');
    setTheoryAnswer('');
    setMessage('Nazariy savol alohida bo\'limga qo\'shildi.');
  }

  return (
    <section className="panel form-panel">
      <Title title="Nazariy savollar" subtitle="Nazariya sahifasida ko'rinadigan savollar. Bu test balliga qo'shilmaydi." />
      <div className="content-form-grid">
        <label>Yo'nalish<select value={direction} onChange={(event) => selectDirection(event.target.value)}>{directions.map((item) => <option key={item.title}>{item.title}</option>)}</select></label>
        <label>Mavzu<select value={topic} onChange={(event) => setTopic(event.target.value)}>{(directionLessons[direction] || []).map((lesson) => <option key={lesson}>{lesson}</option>)}</select></label>
      </div>
      <label>Nazariy savol<textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Masalan: O'zgaruvchi nima va nima uchun kerak?" /></label>
      <label>Javob / izoh<textarea value={theoryAnswer} onChange={(event) => setTheoryAnswer(event.target.value)} placeholder="O'quvchi ko'rishi uchun qisqa izoh yoki javob." /></label>
      {message && <div className="notice"><CheckCircle2 size={18} /> {message}</div>}
      <button className="primary" onClick={saveTheoryQuestion}><Save size={18} /> Nazariy savol qo'shish</button>
      <div className="question-table">
        {theoryQuestions.map((item, index) => <p key={item.id}><b>{index + 1}</b><span>{item.direction}</span><span>{item.topic}</span><em>{item.question}</em></p>)}
      </div>
    </section>
  );
}

const adminQuestionModes = {
  test: {
    title: "Test qo'shish",
    subtitle: "Mavzu bo'yicha oddiy variantli test savollarini kiriting.",
    sections: ['test'],
    defaultSection: 'test',
    button: "Test qo'shish",
    questionLabel: 'Test savoli',
    questionPlaceholder: "Masalan: Python izoh (comment) qanday yoziladi?",
    listSections: ['test'],
  },
  code: {
    title: 'Kod yozish qismi',
    subtitle: "O'quvchi amaliyot bosqichida bajaradigan kod yozish topshiriqlarini kiriting.",
    sections: ['practice'],
    defaultSection: 'practice',
    button: "Kodli topshiriq qo'shish",
    questionLabel: 'Kod yozish topshirig‘i',
    questionPlaceholder: "Masalan: name o'zgaruvchisini yarating va ekranga chiqaring.",
    listSections: ['practice'],
  },
  final: {
    title: 'Yakuniy quiz va dastur',
    subtitle: "Yo'nalish tugaganda ishlaydigan yakuniy quiz va yakuniy dastur topshirig'ini kiriting.",
    sections: ['exam', 'final'],
    defaultSection: 'exam',
    button: "Yakuniy nazorat qo'shish",
    questionLabel: 'Yakuniy savol yoki dastur sharti',
    questionPlaceholder: "Masalan: yakuniy quiz savoli yoki final dastur sharti.",
    listSections: ['exam', 'final'],
  },
};

function getSectionLabel(section) {
  if (section === 'test') return 'Test';
  if (section === 'practice') return 'Kod yozish';
  if (section === 'final') return 'Yakuniy dastur';
  if (section === 'exam') return 'Yakuniy quiz';
  return section;
}

function AdminQuestions({ mode = 'test', questions, setQuestions, directions, directionLessons }) {
  const config = adminQuestionModes[mode] || adminQuestionModes.test;
  const [message, setMessage] = useState('');
  const [direction, setDirection] = useState(directions[0].title);
  const [topic, setTopic] = useState((directionLessons[directions[0].title] || lessons)[0]);
  const [section, setSection] = useState(config.defaultSection);
  const [question, setQuestion] = useState('');
  const [answerOptions, setAnswerOptions] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);
  const [code, setCode] = useState('# Kodi shu yerga yozing');
  const [checkWords, setCheckWords] = useState('');
  const controlQuestions = questions.filter((item) => config.listSections.includes(item.section));

  useEffect(() => {
    setSection(config.defaultSection);
    setMessage('');
    setAnswerOptions(['', '', '', '']);
    setCorrect(0);
  }, [config.defaultSection, mode]);

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

    const isChoice = section === 'test' || section === 'exam';
    const answerList = isChoice ? answerOptions.map((item) => item.trim()) : [];
    if (isChoice && answerList.some((item) => !item)) {
      setMessage("A, B, C, D variantlarning hammasini to'ldiring.");
      return;
    }

    const item = {
      id: createId(),
      direction,
      topic,
      section,
      question: text,
      answers: answerList,
      correct: Number(correct),
      code: code.trim() || '# Kodi shu yerga yozing',
      checkWords: splitList(checkWords),
      points: section === 'practice' ? 8 : 4,
    };
    setQuestions((current) => [...current, item]);
    setQuestion('');
    setAnswerOptions(['', '', '', '']);
    setCorrect(0);
    setCode('# Kodi shu yerga yozing');
    setCheckWords('');
    setMessage(`${getSectionLabel(section)} qo'shildi.`);
  }

  async function importExcel(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    if (file.size > 1024 * 1024 || !allowed.some((ext) => fileName.endsWith(ext))) {
      setMessage('Faqat 1MB gacha boКјlgan .xlsx, .xls yoki .csv fayl yuklang.');
      event.target.value = '';
      return;
    }
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
      <Title title={config.title} subtitle={config.subtitle} />
      <div className="content-form-grid">
        <label>Yo'nalish<select value={direction} onChange={(event) => selectDirection(event.target.value)}>{directions.map((item) => <option key={item.title}>{item.title}</option>)}</select></label>
        <label>Mavzu<select value={topic} onChange={(event) => setTopic(event.target.value)}>{(directionLessons[direction] || []).map((lesson) => <option key={lesson}>{lesson}</option>)}</select></label>
        {config.sections.length > 1 && (
          <label>Nazorat turi<select value={section} onChange={(event) => setSection(event.target.value)}>{config.sections.map((item) => <option key={item} value={item}>{getSectionLabel(item)}</option>)}</select></label>
        )}
      </div>
      <label>{config.questionLabel}<textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={config.questionPlaceholder} /></label>
      {(section === 'test' || section === 'exam') && (
        <div className="answer-builder">
          <b>Javob variantlari</b>
          {answerOptions.map((value, index) => (
            <label key={index} className="answer-option">
              <input
                type="radio"
                name="correct-answer"
                checked={correct === index}
                onChange={() => setCorrect(index)}
              />
              <span>{String.fromCharCode(65 + index)}</span>
              <input
                value={value}
                onChange={(event) => setAnswerOptions((current) => current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))}
                placeholder={`${String.fromCharCode(65 + index)} variant`}
              />
            </label>
          ))}
          <small>To'g'ri javobni radio tugma bilan belgilang.</small>
        </div>
      )}
      {(section === 'practice' || section === 'final') && (
        <div className="content-form-grid">
          <label>Kod yozish uchun boshlang'ich input<textarea value={code} onChange={(event) => setCode(event.target.value)} placeholder="# Kodi shu yerga yozing" /></label>
          <label>Tekshiruv kalit so'zlari<textarea value={checkWords} onChange={(event) => setCheckWords(event.target.value)} placeholder="print; input; name" /></label>
        </div>
      )}
      <button className="primary" onClick={saveManualQuestion}><Save size={18} /> {config.button}</button>
      {mode === 'test' && <label className="upload-box"><Upload size={24} /> Excel fayl yuklash<input type="file" accept=".xlsx,.xls,.csv" onChange={importExcel} /></label>}
      {message && <div className="notice"><CheckCircle2 size={18} /> {message}</div>}
      <div className="question-table">
        {controlQuestions.map((item, index) => <p key={item.id}><b>{index + 1}</b><span>{item.direction}</span><span>{getSectionLabel(item.section)}</span><em>{item.question}</em></p>)}
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
  const [codeSnippet, setCodeSnippet] = useState(initialContent.codeSnippet || '');
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
    setCodeSnippet(content.codeSnippet || '');
  }

  function saveLesson() {
    setLessonContents((current) => ({
      ...current,
      [getLessonContentKey(direction, topic)]: {
        title: title.trim() || topic,
        videoUrl: videoUrl.trim(),
        text: text.trim() || 'Dars matni hali kiritilmagan.',
        codeSnippet: codeSnippet.trim(),
      },
    }));
    setMessage(`${direction} / ${topic} darsi saqlandi.`);
  }

  return (
    <section className="panel lesson-page">
      <Title title="Nazariy dars qo'shish" />
      <label>Yo'nalish<select value={direction} onChange={(event) => selectDirection(event.target.value)}>{directions.map((item) => <option key={item.title}>{item.title}</option>)}</select></label>
      <label>Mavzu<select value={topic} onChange={(event) => selectTopic(event.target.value)}>{currentLessons.map((lesson) => <option key={lesson}>{lesson}</option>)}</select></label>
      <label>Sarlavha<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="O'zgaruvchilar nima?" /></label>
      <label>Video URL yoki fayl<input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://youtube.com/..." /></label>
      <label>Matn<textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Dars matni..." /></label>
      <label>Tavsiya etilgan kod namunasi (Dinamik ko'rsatish uchun)<textarea value={codeSnippet} onChange={(event) => setCodeSnippet(event.target.value)} placeholder="name = 'Ali'..." /></label>
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
