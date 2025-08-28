const pageRoutes = {
  home: "/u",
  guide: "/guide",
  profileSetup: "/profile-setup",
  register: "/register",
  login: "/login",
  signup: "/signup",
  profile: "/u/profile",
  profilePreview: "profile-preview",
  customLogin: "/customLogin",
  customSignup: "/customSignup",
  landing: "/landing",
  profilePage: "/d",
  policy:
    "https://app.enzuzo.com/policies/privacy/f4f88f42-ab80-11ef-8a42-d784fe776dc8",
};

const protectedRoutes = [
  pageRoutes.profile,
  // pageRoutes.profileSetup,
  pageRoutes.profilePreview,
  pageRoutes.landing,
];
const publicRoutes = [
  pageRoutes.home,
  pageRoutes.register,
  pageRoutes.login,
  pageRoutes.profilePage,
];

export { pageRoutes, publicRoutes, protectedRoutes };
