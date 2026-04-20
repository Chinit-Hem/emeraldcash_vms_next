// Khmer Language Support for Emerald Cash VMS
// ភាសាខ្មែរសម្រាប់ Emerald Cash VMS

export type Language = "en" | "km";

export interface Translations {
  // Common
  settings: string;
  profile: string;
  users: string;
  system: string;
  logout: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  create: string;
  refresh: string;
  loading: string;
  error: string;
  success: string;
  confirm: string;
  close: string;
  back: string;
  next: string;
  search: string;
  filter: string;
  sort: string;
  actions: string;
  status: string;
  role: string;
  admin: string;
  staff: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  username: string;
  fullName: string;
  avatar: string;
  upload: string;
  change: string;
  remove: string;
  add: string;
  update: string;
  sync: string;
  dashboard: string;
  vehicles: string;
  training: string;
  sms: string;
  lmsStaff: string;
  memberSince: string;
  you: string;
  teamMembers: string;
  createUser: string;
  userManagement: string;
  systemSettings: string;
  darkMode: string;
  lightMode: string;
  language: string;
  khmer: string;
  english: string;
  quickLinks: string;
  account: string;
  preferences: string;
  appearance: string;
  notifications: string;
  security: string;
  general: string;
  advanced: string;
  about: string;
  help: string;
  support: string;
  version: string;
  copyright: string;
  allRightsReserved: string;
  // Validation
  required: string;
  invalidEmail: string;
  invalidPhone: string;
  passwordMismatch: string;
  minLength: string;
  maxLength: string;
  // Errors
  loadError: string;
  saveError: string;
  deleteError: string;
  networkError: string;
  unknownError: string;
  // Success
  saveSuccess: string;
  deleteSuccess: string;
  createSuccess: string;
  updateSuccess: string;
  syncSuccess: string;
  uploadSuccess: string;
  // Confirmations
  confirmDelete: string;
  confirmLogout: string;
  confirmAction: string;
  // Placeholders
  enterUsername: string;
  enterPassword: string;
  enterEmail: string;
  enterPhone: string;
  enterFullName: string;
  searchUsers: string;
  // Descriptions
  settingsDescription: string;
  profileDescription: string;
  usersDescription: string;
  systemDescription: string;
  createUserDescription: string;
  teamMembersDescription: string;
  // Accessibility
  toggleMenu: string;
  toggleTheme: string;
  toggleLanguage: string;
  goBack: string;
  openSettings: string;
  closeModal: string;
  loadingData: string;
  processing: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Common
    settings: "Settings",
    profile: "Profile",
    users: "Users",
    system: "System",
    logout: "Logout",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    create: "Create",
    refresh: "Refresh",
    loading: "Loading",
    error: "Error",
    success: "Success",
    confirm: "Confirm",
    close: "Close",
    back: "Back",
    next: "Next",
    search: "Search",
    filter: "Filter",
    sort: "Sort",
    actions: "Actions",
    status: "Status",
    role: "Role",
    admin: "Admin",
    staff: "Staff",
    name: "Name",
    email: "Email",
    phone: "Phone",
    password: "Password",
    confirmPassword: "Confirm Password",
    username: "Username",
    fullName: "Full Name",
    avatar: "Avatar",
    upload: "Upload",
    change: "Change",
    remove: "Remove",
    add: "Add",
    update: "Update",
    sync: "Sync",
    dashboard: "Dashboard",
    vehicles: "Vehicles",
    training: "Training",
    sms: "Stock Management",
    lmsStaff: "LMS Staff",
    memberSince: "Member since",
    you: "You",
    teamMembers: "Team Members",
    createUser: "Create New User",
    userManagement: "User Management",
    systemSettings: "System Settings",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    language: "Language",

    khmer: "Khmer",
    english: "English",

    quickLinks: "Quick Links",
    account: "Account",
    preferences: "Preferences",
    appearance: "Appearance",
    notifications: "Notifications",
    security: "Security",
    general: "General",
    advanced: "Advanced",
    about: "About",
    help: "Help",
    support: "Support",
    version: "Version",
    copyright: "Copyright",
    allRightsReserved: "All rights reserved",
    // Validation
    required: "This field is required",
    invalidEmail: "Please enter a valid email",
    invalidPhone: "Please enter a valid phone number",
    passwordMismatch: "Passwords do not match",
    minLength: "Must be at least {min} characters",
    maxLength: "Must be at most {max} characters",
    // Errors
    loadError: "Failed to load data",
    saveError: "Failed to save changes",
    deleteError: "Failed to delete",
    networkError: "Network error. Please check your connection",
    unknownError: "An unknown error occurred",
    // Success
    saveSuccess: "Changes saved successfully",
    deleteSuccess: "Deleted successfully",
    createSuccess: "Created successfully",
    updateSuccess: "Updated successfully",
    syncSuccess: "Synced successfully",
    uploadSuccess: "Uploaded successfully",
    // Confirmations
    confirmDelete: "Are you sure you want to delete?",
    confirmLogout: "Are you sure you want to logout?",
    confirmAction: "Are you sure you want to proceed?",
    // Placeholders
    enterUsername: "Enter username",
    enterPassword: "Enter password",
    enterEmail: "Enter email address",
    enterPhone: "Enter phone number",
    enterFullName: "Enter full name",
    searchUsers: "Search users...",
    // Descriptions
    settingsDescription: "Manage your account, users, and system preferences",
    profileDescription: "View and manage your profile information",
    usersDescription: "Manage team members and their permissions",
    systemDescription: "Configure system-wide settings",
    createUserDescription: "Add a new team member to the system",
    teamMembersDescription: "users in system",
    // Accessibility
    toggleMenu: "Toggle menu",
    toggleTheme: "Toggle dark mode",
    toggleLanguage: "Toggle language",
    goBack: "Go back",
    openSettings: "Open settings",
    closeModal: "Close modal",
    loadingData: "Loading data...",
    processing: "Processing...",
  },
  km: {
    // Common
    settings: "ការកំណត់",
    profile: "ប្រវត្តិរូប",
    users: "អ្នកប្រើប្រាស់",
    system: "ប្រព័ន្ធ",
    logout: "ចាកចេញ",
    save: "រក្សាទុក",
    cancel: "បោះបង់",
    delete: "លុប",
    edit: "កែប្រែ",
    create: "បង្កើត",
    refresh: "ធ្វើឱ្យថ្មី",
    loading: "កំពុងផ្ទុក",
    error: "កំហុស",
    success: "ជោគជ័យ",
    confirm: "បញ្ជាក់",
    close: "បិទ",
    back: "ត្រឡប់ក្រោយ",
    next: "បន្ទាប់",
    search: "ស្វែងរក",
    filter: "តម្រង",
    sort: "តម្រៀប",
    actions: "សកម្មភាព",
    status: "ស្ថានភាព",
    role: "តួនាទី",
    admin: "អ្នកគ្រប់គ្រង",
    staff: "បុគ្គលិក",
    name: "ឈ្មោះ",
    email: "អ៊ីមែល",
    phone: "ទូរស័ព្ទ",
    password: "ពាក្យសម្ងាត់",
    confirmPassword: "បញ្ជាក់ពាក្យសម្ងាត់",
    username: "ឈ្មោះអ្នកប្រើ",
    fullName: "ឈ្មោះពេញ",
    avatar: "រូបតំណាង",
    upload: "ផ្ទុកឡើង",
    change: "ផ្លាស់ប្តូរ",
    remove: "យកចេញ",
    add: "បន្ថែម",
    update: "ធ្វើឱ្យទាន់សម័យ",
    sync: "សមកាលកម្ម",
    dashboard: "ផ្ទាំងគ្រប់គ្រង",
    vehicles: "យានយន្ត",
    training: "ការបណ្តុះបណ្តាល",
    sms: "គ្រប់គ្រងស្តុក",
    lmsStaff: "បុគ្គលិក LMS",
    memberSince: "សមាជិកតាំងពី",
    you: "អ្នក",
    teamMembers: "សមាជិកក្រុម",
    createUser: "បង្កើតអ្នកប្រើប្រាស់ថ្មី",
    userManagement: "ការគ្រប់គ្រងអ្នកប្រើប្រាស់",
    systemSettings: "ការកំណត់ប្រព័ន្ធ",
    darkMode: "របៀបងងឹត",
    lightMode: "របៀបភ្លឺ",
    language: "ភាសា",
    khmer: "ខ្មែរ",
    english: "អង់គ្លេស",
    quickLinks: "តំណភ្ជាប់លឿន",
    account: "គណនី",
    preferences: "ចំណូលចិត្ត",
    appearance: "រូបរាង",
    notifications: "ការជូនដំណឹង",
    security: "សុវត្ថិភាព",
    general: "ទូទៅ",
    advanced: "កម្រិតខ្ពស់",
    about: "អំពី",
    help: "ជំនួយ",
    support: "គាំទ្រ",
    version: "ជំនាន់",
    copyright: "រក្សាសិទ្ធិ",
    allRightsReserved: "រក្សាសិទ្ធិគ្រប់យ៉ាង",
    // Validation
    required: "វាលនេះត្រូវបានទាមទារ",
    invalidEmail: "សូមបញ្ចូលអ៊ីមែលត្រឹមត្រូវ",
    invalidPhone: "សូមបញ្ចូលលេខទូរស័ព្ទត្រឹមត្រូវ",
    passwordMismatch: "ពាក្យសម្ងាត់មិនត្រូវគ្នា",
    minLength: "ត្រូវតែមានយ៉ាងហោចណាស់ {min} តួអក្សរ",
    maxLength: "ត្រូវតែមានច្រើនបំផុត {max} តួអក្សរ",
    // Errors
    loadError: "បរាជ័យក្នុងការផ្ទុកទិន្នន័យ",
    saveError: "បរាជ័យក្នុងការរក្សាទុកការផ្លាស់ប្តូរ",
    deleteError: "បរាជ័យក្នុងការលុប",
    networkError: "កំហុសបណ្តាញ។ សូមពិនិត្យមើលការតភ្ជាប់របស់អ្នក",
    unknownError: "មានកំហុសមិនស្គាល់បានកើតឡើង",
    // Success
    saveSuccess: "បានរក្សាទុកការផ្លាស់ប្តូរដោយជោគជ័យ",
    deleteSuccess: "បានលុបដោយជោគជ័យ",
    createSuccess: "បានបង្កើតដោយជោគជ័យ",
    updateSuccess: "បានធ្វើឱ្យទាន់សម័យដោយជោគជ័យ",
    syncSuccess: "បានសមកាលកម្មដោយជោគជ័យ",
    uploadSuccess: "បានផ្ទុកឡើងដោយជោគជ័យ",
    // Confirmations
    confirmDelete: "តើអ្នកប្រាកដជាចង់លុបឬទេ?",
    confirmLogout: "តើអ្នកប្រាកដជាចង់ចាកចេញឬទេ?",
    confirmAction: "តើអ្នកប្រាកដជាចង់បន្តឬទេ?",
    // Placeholders
    enterUsername: "បញ្ចូលឈ្មោះអ្នកប្រើ",
    enterPassword: "បញ្ចូលពាក្យសម្ងាត់",
    enterEmail: "បញ្ចូលអាសយដ្ឋានអ៊ីមែល",
    enterPhone: "បញ្ចូលលេខទូរស័ព្ទ",
    enterFullName: "បញ្ចូលឈ្មោះពេញ",
    searchUsers: "ស្វែងរកអ្នកប្រើប្រាស់...",
    // Descriptions
    settingsDescription: "គ្រប់គ្រងគណនីរបស់អ្នក អ្នកប្រើប្រាស់ និងចំណូលចិត្តប្រព័ន្ធ",
    profileDescription: "មើល និងគ្រប់គ្រងព័ត៌មានប្រវត្តិរូបរបស់អ្នក",
    usersDescription: "គ្រប់គ្រងសមាជិកក្រុម និងការអនុញ្ញាតរបស់ពួកគេ",
    systemDescription: "កំណត់រចនាសម្ព័ន្ធការកំណត់ទូទាំងប្រព័ន្ធ",
    createUserDescription: "បន្ថែមសមាជិកក្រុមថ្មីទៅប្រព័ន្ធ",
    teamMembersDescription: "អ្នកប្រើប្រាស់ក្នុងប្រព័ន្ធ",
    // Accessibility
    toggleMenu: "បិទ/បើកម៉ឺនុយ",
    toggleTheme: "បិទ/បើករបៀបងងឹត",
    toggleLanguage: "បិទ/បើកភាសា",
    goBack: "ត្រឡប់ក្រោយ",
    openSettings: "បើកការកំណត់",
    closeModal: "បិទផ្ទាំង",
    loadingData: "កំពុងផ្ទុកទិន្នន័យ...",
    processing: "កំពុងដំណើរការ...",
  },
};

// Hook for using translations
export function useTranslation(lang: Language) {
  return {
    t: translations[lang],
    lang,
  };
}

// Format translation with variables
export function formatTranslation(
  text: string,
  vars: Record<string, string | number>
): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(`{${key}}`, String(value));
  }
  return result;
}
