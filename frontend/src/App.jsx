import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, ShieldAlert, LockKeyhole, MailWarning, Wallet, Globe2, Users,
  Fingerprint, ArrowUpRight, Menu, X, Search, BookOpen, CircleHelp, Activity,
  LogIn, LogOut, UserRound, LayoutDashboard, Plus, Trash2, Pencil, CheckCircle2,
  AlertTriangle, ChevronRight, ExternalLink, Languages, Sparkles, HeartHandshake,
  Link2, Eye, EyeOff, BadgeCheck, FileText, ChartNoAxesColumn, Home, RefreshCw
} from "lucide-react";

import { request, track } from "./api.js";
import AdminPage from "./Admin.jsx";
const iconMap = { mail: MailWarning, wallet: Wallet, lock: LockKeyhole, globe: Globe2, users: Users, fingerprint: Fingerprint, shield: ShieldCheck };
const categories = ["All", "Scams", "Payments", "Account safety", "Browsing", "Privacy", "Personal data"];
const initialTopics = [
  { id:"a", title:"Spot a phishing message", category:"Scams", icon:"mail", summary:"Recognize messages designed to steal your details.", content:"Pause before you tap. Check the sender carefully, look for unexpected urgency, spelling mistakes, unusual requests and links that do not match the claimed organization. Never share passwords, PINs or OTPs." },
  { id:"b", title:"Protect your UPI payments", category:"Payments", icon:"wallet", summary:"Understand collect requests, QR-code tricks and payment fraud.", content:"You do not enter a UPI PIN to receive money. Approve only payment requests you understand. Verify the receiver name and amount before paying." },
  { id:"c", title:"Keep your passwords strong", category:"Account safety", icon:"lock", summary:"Create unique passwords and secure important accounts.", content:"Use a long, unique password for every important account. Turn on multi-factor authentication wherever possible. Never share a password or OTP." }
];
const fallbackScams = [
  { id:"s1", title:"Your bank account will be blocked", channel:"SMS / WhatsApp", example:"URGENT: Your bank account will be blocked today. Click this link and update your KYC immediately.", warningSigns:["Creates panic with a deadline","Uses an unfamiliar link","Requests sensitive banking details"], safeAction:"Do not open the link. Contact your bank using the number on its official website, card or app." },
  { id:"s2", title:"You have won a prize", channel:"Call / Message", example:"Congratulations! You have won a large cash prize. Pay a small processing fee to claim it.", warningSigns:["Unexpected prize","Asks for an advance payment","Pressures you to act quickly"], safeAction:"Do not pay or share personal details. Block and report the sender." },
  { id:"s3", title:"UPI collect request disguised as a refund", channel:"UPI app / WhatsApp", example:"Your refund is ready. Approve this UPI collect request and enter your PIN to receive the money.", warningSigns:["A collect request asks you to pay","Claims a UPI PIN is needed to receive money","Creates urgency around a refund"], safeAction:"Decline unexpected collect requests. A UPI PIN authorizes a payment; verify refunds inside the official merchant app." },
  { id:"s4", title:"Fake payment screenshot", channel:"In person / WhatsApp", example:"I have paid you. Here is the screenshot. Please hand over the item now; the bank message will arrive later.", warningSigns:["Relies on a screenshot instead of actual account credit","Pressures you to release goods quickly","May use an edited or reused receipt"], safeAction:"Check your own bank or UPI app balance and transaction history before handing over goods. Never rely only on a screenshot." },
  { id:"s5", title:"QR code to receive money", channel:"WhatsApp / Social media", example:"Scan this QR code and enter your UPI PIN so the payment can be credited to you.", warningSigns:["Says scanning is required to receive money","Asks for a UPI PIN","The sender is not independently verified"], safeAction:"Do not scan it. You do not need to enter a UPI PIN to receive money." },
  { id:"s6", title:"Fake bank customer-care number", channel:"Search result / Website", example:"I found a customer-care number online. Call this number and share your account details to resolve the issue.", warningSigns:["Number may come from an advertisement or unofficial listing","Caller asks for OTP, PIN or card details","Requests remote access or a payment"], safeAction:"Find the contact number inside your bank's official app, on your card or on its verified website." },
  { id:"s7", title:"Courier delivery fee message", channel:"SMS", example:"Your parcel is on hold. Pay ₹25 now using this link to avoid return to sender.", warningSigns:["Unexpected small fee","Shortened or unfamiliar payment link","No matching order or tracking details"], safeAction:"Check the shipment using the courier's official website or app and tracking number you already have." },
  { id:"s8", title:"Fake parcel customs charge", channel:"SMS / Email", example:"Your international package is stuck at customs. Pay this charge immediately to release it.", warningSigns:["Unexpected customs demand","Threat of parcel seizure or return","Payment link does not belong to the official carrier"], safeAction:"Contact the courier through its official channel. Do not pay through a message link." },
  { id:"s9", title:"Work-from-home task scam", channel:"WhatsApp / Telegram", example:"Earn ₹3,000 daily by liking videos. Deposit money to unlock premium tasks and withdraw your earnings.", warningSigns:["Promises unusually high pay for simple tasks","Requires deposits to unlock work or withdrawals","May show fake earnings to build trust"], safeAction:"Do not deposit money. Verify the employer independently and stop if payment is required to receive wages." },
  { id:"s10", title:"Fake job offer with registration fee", channel:"Email / Call", example:"You are selected for a job without an interview. Pay a refundable registration or document-verification fee.", warningSigns:["Job offered without a credible selection process","Requests a fee from the applicant","Uses unofficial email addresses or pressure"], safeAction:"Verify the vacancy on the employer's official careers page and never pay a recruiter to secure a job." },
  { id:"s11", title:"Investment group guaranteed returns", channel:"Telegram / WhatsApp", example:"Join our private group. Invest today and get guaranteed 5x returns next week.", warningSigns:["Guaranteed or extraordinary returns","Unregistered advisers and anonymous group admins","Pressure to transfer funds quickly"], safeAction:"Do not transfer money based on group messages. Check the firm and adviser with the relevant regulator and seek independent advice." },
  { id:"s12", title:"Fake trading app or APK", channel:"Social media / Message", example:"Download this special trading APK outside the app store to access exclusive profits.", warningSigns:["Asks you to sideload an app","Unknown publisher or excessive permissions","Promises profits that cannot be verified"], safeAction:"Do not install unknown APK files. Use official app stores and verify financial services before investing." },
  { id:"s13", title:"Loan app demands advance fee", channel:"SMS / App", example:"Your instant loan is approved. Pay a processing fee to this personal UPI ID before the amount is released.", warningSigns:["Advance payment to a personal account","No clear lender identity or terms","Requests access to contacts, photos or messages"], safeAction:"Verify the lender and app, read the loan terms, and avoid paying fees to personal UPI IDs." },
  { id:"s14", title:"Digital arrest impersonation", channel:"Video call / Phone", example:"This is a law-enforcement officer. You are under investigation. Stay on video call and transfer money for verification.", warningSigns:["Threats and intimidation","Claims you cannot disconnect or contact family","Demands money for verification or settlement"], safeAction:"End the call. No legitimate agency conducts a so-called digital arrest or demands money this way. Verify independently with official authorities." },
  { id:"s15", title:"Impersonating a family member", channel:"WhatsApp", example:"I lost my phone. This is my new number. Please send money urgently and do not call because I am busy.", warningSigns:["New or unfamiliar number","Urgent request for money","Avoids a voice or video verification"], safeAction:"Call the family member on their saved number or verify using a question only they would know. Do not transfer until confirmed." },
  { id:"s16", title:"Social-media account takeover link", channel:"Instagram / Facebook DM", example:"Your account violates policy. Appeal now using this link or your profile will be deleted.", warningSigns:["Threatens account suspension","Link leads away from the official platform","Requests password or login code"], safeAction:"Open the platform directly and check account notifications. Never enter credentials through an unsolicited message." },
  { id:"s17", title:"Fake social-media giveaway", channel:"Instagram / Facebook", example:"You won our giveaway. Send your address and pay courier charges to claim the phone.", warningSigns:["You did not enter or the account is a copy","Requests payment or sensitive details","Impersonates a known brand or creator"], safeAction:"Check the giveaway on the verified official account and do not pay a fee to claim an unexpected prize." },
  { id:"s18", title:"Romance or friendship money request", channel:"Dating app / Social media", example:"I trust you completely. I have an emergency and need you to send money before we can meet.", warningSigns:["Relationship develops unusually quickly","Repeated emergencies and requests for money","Avoids reasonable identity verification"], safeAction:"Do not send money or identity documents to someone you have not independently verified. Talk to a trusted person." },
  { id:"s19", title:"Screen-sharing app support scam", channel:"Phone call", example:"Install this remote-support app and share the code so I can fix your banking issue.", warningSigns:["Unsolicited support call","Requests screen sharing or remote control","Could expose OTPs and banking activity"], safeAction:"Do not install the app or share its access code. Disconnect and contact the company using official details." },
  { id:"s20", title:"SIM swap or duplicate SIM fraud", channel:"Phone / Mobile network", example:"Your SIM will stop working. Share the code we sent to activate your replacement SIM.", warningSigns:["Unexpected request for an OTP or SIM details","Sudden loss of mobile network","Unrecognized account or SIM-change alerts"], safeAction:"Never share SIM-related OTPs. Contact your mobile operator immediately from another phone if service suddenly stops." },
  { id:"s21", title:"Fake shopping website with huge discounts", channel:"Advertisement / Website", example:"Today's only sale: branded phone at 90% off. Pay online now; cash on delivery is unavailable.", warningSigns:["Unrealistic discount","New or misspelled domain","No verifiable business address or return policy"], safeAction:"Research the seller, check independent reviews and use trusted marketplaces or the brand's official store." },
  { id:"s22", title:"Fake customer-care refund call", channel:"Phone call", example:"Your order refund failed. Tell me the OTP and UPI PIN so I can credit the amount manually.", warningSigns:["Caller asks for OTP or UPI PIN","Unexpected call about a refund","Requests a payment or collect approval"], safeAction:"End the call and check the order in the official app. Never disclose OTPs or UPI PINs." },
  { id:"s23", title:"QR code at a public place replaced", channel:"QR code / In person", example:"Scan this sticker to pay the parking or shop fee to this account.", warningSigns:["Sticker may cover the original QR code","Payee name does not match the business","No receipt or official payment confirmation"], safeAction:"Confirm the payee name with staff before paying and use the business's verified payment method." },
  { id:"s24", title:"Fake electricity disconnection warning", channel:"SMS / WhatsApp", example:"Your electricity will be disconnected tonight. Call this number and pay immediately to avoid penalty.", warningSigns:["Threatens immediate disconnection","Provides a personal number or payment link","Demands urgent payment outside normal channels"], safeAction:"Check your bill and account on the electricity provider's official website or app. Call its published helpline." },
  { id:"s25", title:"Fake traffic challan link", channel:"SMS", example:"A traffic challan is pending. Pay now through this link to avoid legal action.", warningSigns:["Unexpected payment link","Unfamiliar domain or spelling","No matching challan in the official portal"], safeAction:"Check challans by entering the official government portal yourself. Do not use the message link." },
  { id:"s26", title:"Aadhaar or PAN update phishing", channel:"SMS / Email", example:"Your Aadhaar or PAN will be deactivated. Upload your document and bank details using this link.", warningSigns:["Threat of deactivation","Requests identity documents through an unsolicited link","Domain is not an official government domain"], safeAction:"Use the official UIDAI or Income Tax Department website reached independently. Share documents only when necessary." },
  { id:"s27", title:"Fake charity or disaster donation", channel:"Social media / Message", example:"Donate immediately to this personal UPI ID for emergency relief. Forward this message to everyone.", warningSigns:["Emotional pressure and urgency","No verifiable organization or registration details","Payment goes to an unrelated personal account"], safeAction:"Verify the charity and its official donation channel before contributing. Do not rely only on forwarded messages." },
  { id:"s28", title:"Malicious file or document attachment", channel:"Email / WhatsApp", example:"Open this invoice, resume or delivery receipt attachment and enable macros to view it.", warningSigns:["Unexpected attachment","Asks you to enable macros or install software","Sender or file type is suspicious"], safeAction:"Confirm with the sender through another channel. Do not enable macros or run unknown files; scan files with trusted security software." },
  { id:"s29", title:"Fake tech-support virus alert", channel:"Pop-up / Phone", example:"Your computer is infected. Call this number now and pay for support before your files are deleted.", warningSigns:["Scary pop-up with a phone number","Requests remote access or payment","Claims to be an operating-system security warning"], safeAction:"Close the browser tab or use trusted security tools. Do not call the pop-up number or grant remote access." },
  { id:"s30", title:"OTP forwarding or account verification scam", channel:"Call / WhatsApp", example:"I accidentally sent a code to your phone. Please read it to me so I can complete my verification.", warningSigns:["Asks you to forward or read an OTP","Uses a made-up mistake to gain trust","Could authorize login or a transaction"], safeAction:"Never share an OTP. Let the sender recover their own account through the official service." }
];

const starterQuiz = {
  id: "starter-quiz",
  title: "Everyday Cyber Safety",
  description: "Test your knowledge with practical situations involving UPI, phishing, passwords and online safety.",
  questions: [
    { id:"q1", question:"Someone asks for your UPI PIN to send you money. What should you do?", options:["Share it to receive the money","Do not share it; a PIN authorizes payments","Send your OTP instead"], answerIndex:1, explanation:"A UPI PIN authorizes a payment. You do not need it to receive money." },
    { id:"q2", question:"A message says your bank account will close in 10 minutes and includes a link. What is safest?", options:["Click quickly","Forward it to friends","Verify through the official app or website"], answerIndex:2, explanation:"Urgency and unexpected links are common warning signs. Verify independently." },
    { id:"q3", question:"Does the HTTPS padlock guarantee a website is genuine?", options:["Yes, always","No, it only indicates an encrypted connection","Only on mobile"], answerIndex:1, explanation:"Scam websites can also use HTTPS. Check the domain and reach services through trusted routes." },
    { id:"q4", question:"What should you do with an OTP?", options:["Share it with customer care","Post it only in private groups","Keep it secret and never share it"], answerIndex:2, explanation:"Never disclose an OTP over a call or message." },
    { id:"q5", question:"A stranger offers a high-paying job but asks for a registration fee. What is safest?", options:["Pay immediately","Verify the employer and do not pay to get a job","Share your bank OTP"], answerIndex:1, explanation:"A request for an advance fee is a warning sign. Verify job offers through official channels." },
    { id:"q6", question:"A caller asks you to install a screen-sharing app to process a refund. What should you do?", options:["Install it and share the code","End the call and contact the company officially","Open your banking app while sharing"], answerIndex:1, explanation:"Remote access can expose messages, passwords and financial apps." },
    { id:"q7", question:"A friend messages from a new number asking for urgent money. What should you do first?", options:["Transfer immediately","Verify by calling their saved number","Ask them to send a QR code"], answerIndex:1, explanation:"Impersonation scams often use urgency. Verify through a known, separate channel." },
    { id:"q8", question:"Which password habit is safest?", options:["Reuse one password everywhere","Use a unique long password for each account","Use your birthday"], answerIndex:1, explanation:"Unique, long passwords reduce the impact of a password leak." },
    { id:"q9", question:"You receive a QR code to claim a refund. What is correct?", options:["Enter your UPI PIN after scanning","You do not need a UPI PIN to receive money","Share your OTP with the sender"], answerIndex:1, explanation:"A UPI PIN is used to authorize payments, not to receive money." },
    { id:"q10", question:"You suspect money has been stolen through cyber fraud in India. What should you do promptly?", options:["Wait a few days","Call 1930 and report at cybercrime.gov.in","Delete all messages"], answerIndex:1, explanation:"Report financial cyber fraud promptly through helpline 1930 and the National Cyber Crime Reporting Portal." }
  ]
};

function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("cs_user") || "null"));
  const [mobileMenu, setMobileMenu] = useState(false);
  const [topics, setTopics] = useState(initialTopics);
  const [scams, setScams] = useState(fallbackScams);
  const [quizzes, setQuizzes] = useState([]);
  const [notice, setNotice] = useState("");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(true);
  const [largeText, setLargeText] = useState(false);

  useEffect(() => {
    request("/content").then(data => {
      setTopics(data.topics?.length ? data.topics : initialTopics);
      // Always keep the built-in scam examples visible, even if the database has only a few entries.
      const databaseScams = Array.isArray(data.scams) ? data.scams : [];
      const mergedScams = [...fallbackScams, ...databaseScams.filter(item => !fallbackScams.some(base => base.title.toLowerCase() === String(item.title || "").toLowerCase()))];
      setScams(mergedScams);
      setQuizzes(Array.isArray(data.quizzes) ? data.quizzes.filter(q => q && q.id && q.title) : []);
    }).catch(() => setNotice("Showing starter awareness content. Connect the database to enable live content management."))
      .finally(() => setLoading(false));
  }, []);

  // Record page visits for signed-in users so administrators can follow activity.
  useEffect(() => {
    if (!user || user.role === "admin" || page === "login" || page === "register") return;
    const labels = Object.fromEntries([["home","Home"],["learn","Learn"],["scams","Scam library"],["games","Play games"],["quiz","Cyber quiz"],["link-check","Link checker"],["emergency","Emergency help"],["dashboard","My space"]]);
    if (page === "emergency") track("report_help", "Opened emergency guidance", { page });
    else track("page_view", `Viewed ${labels[page] || page}`, { page });
  }, [page, user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  // A suspended, deleted or expired account is signed out cleanly.
  useEffect(() => {
    const expired = () => { setUser(null); setNotice("Your session has ended. Please sign in again."); setPage("login"); };
    window.addEventListener("cs-session-expired", expired);
    return () => window.removeEventListener("cs-session-expired", expired);
  }, []);

  const isAdmin = user?.role === "admin";
  const navigate = (next) => { setPage(next); setMobileMenu(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const login = (data) => {
    localStorage.setItem("cs_token", data.token);
    localStorage.setItem("cs_user", JSON.stringify(data.user));
    setUser(data.user);
    navigate(data.user.role === "admin" ? "admin" : "dashboard");
  };
  const logout = () => {
    if (user?.role !== "admin") track("logout", "Signed out");
    localStorage.removeItem("cs_token"); localStorage.removeItem("cs_user");
    setUser(null); navigate("home");
  };

  const navItems = [
    ["home", "Home"], ["learn", "Learn"], ["scams", "Scam library"], ["games", "Play games"], ["quiz", "Cyber quiz"], ["link-check", "Link checker"], ["emergency", "Emergency help"]
  ];
  const t = (english, hindi) => language === "hi" ? hindi : english;

  return <div className={largeText ? "app-shell large-text" : "app-shell"}>
    <div className="top-strip"><span><ShieldCheck size={14}/> {t("Practical digital safety for everyday life","रोज़मर्रा के जीवन के लिए डिजिटल सुरक्षा")}</span><span className="top-right">A community awareness initiative <span className="dot"/> India</span></div>
    <header className="header">
      <button className="brand" onClick={() => navigate("home")} aria-label="Cyber Saathi home">
        <span className="brand-mark"><ShieldCheck size={25}/></span>
        <span><strong>cyber<span>saathi</span></strong><small>STAY ALERT. STAY SAFE.</small></span>
      </button>
      <button className="text-size-toggle" onClick={() => setLargeText(v => !v)} aria-pressed={largeText} title="Toggle larger text">A<span>+</span></button>
      <button className="mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu">{mobileMenu ? <X/> : <Menu/>}</button>
      <nav className={mobileMenu ? "nav open" : "nav"}>
        {navItems.map(([id,label]) => <button key={id} className={page === id ? "nav-link active" : "nav-link"} onClick={() => navigate(id)}>{label}</button>)}
                {user ? <><button className="nav-account" onClick={() => navigate(isAdmin ? "admin" : "dashboard")}>{isAdmin ? <LayoutDashboard size={16}/> : <UserRound size={16}/>} {isAdmin ? "Admin" : "My space"}</button><button className="nav-logout" onClick={logout} title="Sign out" aria-label="Sign out"><LogOut size={16}/> <span>Logout</span></button></> : <button className="nav-login" onClick={() => navigate("login")}><LogIn size={16}/> Sign in</button>}
      </nav>
    </header>

    {notice && <div className="notice"><AlertTriangle size={16}/>{notice}<button onClick={() => setNotice("")}><X size={15}/></button></div>}

    <main>
      {page === "home" && <HomePage navigate={navigate} t={t} topics={topics}/>}
      {page === "learn" && <LearnPage topics={topics} t={t}/>}
      {page === "scams" && <ScamPage scams={scams}/>}
      {page === "games" && <GameZone/>}
      {page === "quiz" && <QuizPage quizzes={quizzes} user={user} navigate={navigate}/>}
      {page === "link-check" && <LinkChecker/>}
      {page === "emergency" && <EmergencyPage/>}
      {page === "login" && <AuthPage mode="login" onSuccess={login} switchMode={() => navigate("register")}/>}
      {page === "register" && <AuthPage mode="register" onSuccess={login} switchMode={() => navigate("login")}/>}
      {page === "dashboard" && (user ? <UserDashboard user={user} navigate={navigate} logout={logout}/> : <AuthPrompt navigate={navigate}/>)}
      {page === "admin" && (isAdmin ? <AdminPage/> : <AuthPrompt navigate={navigate} admin/>)}
    </main>

    <Footer navigate={navigate}/>
    <div className="floating-help" onClick={() => navigate("emergency")} role="button" tabIndex="0"><HeartHandshake size={17}/> Need help?</div>
  </div>;
}

function HomePage({ navigate, t, topics }) {
  return <>
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-line"/> DIGITAL AWARENESS. REAL-WORLD PROTECTION.</div>
        <h1>{t("The internet is powerful. ","इंटरनेट शक्तिशाली है। ")}<em>{t("Stay one step safer.","सुरक्षित रहना सीखें।")}</em></h1>
        <p>{t("Simple, practical guidance to help you recognize online scams, protect your personal information and use digital services with confidence.","ऑनलाइन धोखाधड़ी पहचानने, अपनी जानकारी सुरक्षित रखने और डिजिटल सेवाओं का भरोसे के साथ उपयोग करने के लिए सरल मार्गदर्शन।")}</p>
        <div className="hero-actions"><button className="btn btn-primary" onClick={() => navigate("learn")}>Explore safety guides <ArrowUpRight size={17}/></button><button className="btn btn-quiet" onClick={() => navigate("quiz")}><CircleHelp size={17}/> Take a quick quiz</button></div>
        <div className="hero-proof"><span><CheckCircle2 size={15}/> Easy-to-understand</span><span><CheckCircle2 size={15}/> Practical examples</span><span><CheckCircle2 size={15}/> Free to explore</span></div>
      </div>
      <div className="hero-art">
        <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
        <div className="shield-illustration"><div className="shield-glow"/><ShieldCheck size={112} strokeWidth={1.2}/><span className="shield-check"><CheckCircle2 size={25}/></span></div>
        <div className="float-card card-threat"><span className="mini-icon red"><MailWarning size={17}/></span><span><b>Suspicious message?</b><small>Pause. Check. Verify.</small></span><span className="status-dot"/></div>
        <div className="float-card card-safe"><span className="mini-icon green"><LockKeyhole size={17}/></span><span><b>Your safety matters</b><small>Build safer digital habits</small></span></div>
        <div className="art-caption">YOUR DIGITAL SAFETY COMPANION</div>
      </div>
    </section>

    <section className="trust-row">
      <div><span className="trust-icon"><ShieldCheck/></span><span><b>Think before you click</b><small>Pause and verify unexpected links</small></span></div>
      <div><span className="trust-icon"><LockKeyhole/></span><span><b>Protect what matters</b><small>Keep accounts and data secure</small></span></div>
      <div><span className="trust-icon"><HeartHandshake/></span><span><b>Know where to get help</b><small>Take action if something goes wrong</small></span></div>
    </section>

    <section className="section section-pad">
      <SectionHeading eyebrow="KNOW THE RISKS" title="A little awareness goes a long way" subtitle="Understand the tricks scammers use, and learn the simple steps that can help you stay safe."/>
      <div className="topic-grid home-topics">{topics.slice(0,3).map((topic,i) => <TopicCard key={topic.id || i} topic={topic}/>)}</div>
      <div className="center-action"><button className="btn btn-outline" onClick={() => navigate("learn")}>View all safety topics <ArrowUpRight size={16}/></button></div>
    </section>

    <section className="dark-band">
      <div className="dark-band-inner"><div><div className="eyebrow light"><span className="eyebrow-line"/> NOT SURE IF IT'S A SCAM?</div><h2>Take a moment. <em>Check before you trust.</em></h2><p>Explore a suspicious message or learn how to inspect a link before opening it.</p></div><button className="btn btn-white" onClick={() => navigate("scams")}>Explore scam examples <ArrowUpRight size={17}/></button></div>
    </section>

    <section className="section section-pad">
      <SectionHeading eyebrow="LEARN BY DOING" title="Build confidence, one step at a time" subtitle="Try simple tools designed to turn awareness into safer everyday decisions."/>
      <div className="feature-grid">
        <FeatureCard icon={<MailWarning/>} number="01" title="Scam library" desc="See examples of suspicious messages and understand their warning signs." action="Explore examples" onClick={() => navigate("scams")}/>
        <FeatureCard icon={<Link2/>} number="02" title="Link checker" desc="Review common URL warning signs before you decide what to do." action="Check a link" onClick={() => navigate("link-check")}/>
        <FeatureCard icon={<CircleHelp/>} number="03" title="Cyber quiz" desc="Test your knowledge with short, practical questions." action="Take the quiz" onClick={() => navigate("quiz")}/>
        <FeatureCard icon={<Sparkles/>} number="04" title="Cyber safety games" desc="Play quick, colourful games to practise spotting online tricks." action="Play a game" onClick={() => navigate("games")}/>
      </div>
    </section>

    <section className="emergency-banner"><div className="emergency-symbol"><ShieldAlert size={30}/></div><div><span className="eyebrow">ACT QUICKLY, NOT IN PANIC</span><h3>Think you've been scammed?</h3><p>Learn what to do next, how to preserve evidence and where to report cybercrime in India.</p></div><button className="btn btn-primary" onClick={() => navigate("emergency")}>Get help now <ArrowUpRight size={17}/></button></section>
  </>;
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return <div className="section-heading"><div className="eyebrow"><span className="eyebrow-line"/>{eyebrow}</div><h2>{title}</h2><p>{subtitle}</p></div>;
}
function TopicCard({ topic }) {
  const Icon = iconMap[topic.icon] || ShieldCheck;
  return <article className="topic-card"><div className="topic-card-top"><span className="topic-icon"><Icon size={22}/></span><span className="topic-category">{topic.category}</span></div><h3>{topic.title}</h3><p>{topic.summary}</p><details><summary>Read safety guide <ChevronRight size={15}/></summary><div className="topic-detail">{topic.content}</div></details></article>;
}
function FeatureCard({ icon, number, title, desc, action, onClick }) {
  return <article className="feature-card"><div className="feature-top"><span className="feature-icon">{icon}</span><span>{number}</span></div><h3>{title}</h3><p>{desc}</p><button onClick={onClick}>{action} <ArrowUpRight size={15}/></button></article>;
}

function LearnPage({ topics, t }) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const visible = topics.filter(x => (filter === "All" || x.category === filter) && `${x.title} ${x.summary} ${x.content}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="page-wrap"><PageIntro eyebrow="AWARENESS HUB" title="Learn to stay safer online" desc="Clear, practical guides to common digital threats. No technical background needed."/>
    <div className="filter-bar"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search safety topics..."/></div><div className="filter-pills">{categories.map(c=><button key={c} className={filter===c?"selected":""} onClick={()=>setFilter(c)}>{c}</button>)}</div></div>
    {visible.length ? <div className="topic-grid">{visible.map((topic,i)=><TopicCard key={topic.id || i} topic={topic}/>)}</div> : <EmptyState title="No matching guides" text="Try another search term or choose a different category."/>}
  </div>;
}
function PageIntro({ eyebrow, title, desc }) { return <div className="page-intro"><div className="eyebrow"><span className="eyebrow-line"/>{eyebrow}</div><h1>{title}</h1><p>{desc}</p></div>; }
function ScamPage({ scams }) {
  const [expanded, setExpanded] = useState(null);
  return <div className="page-wrap"><PageIntro eyebrow="SCAM LIBRARY" title="Learn to spot the warning signs" desc="These are illustrative examples of common scam approaches. The wording may vary, but the pressure tactics are often similar."/>
    <div className="scam-list">{scams.map((scam,i)=><article className="scam-card" key={scam.id || i}><div className="scam-head"><div><span className="scam-channel">{scam.channel}</span><h3>{scam.title}</h3></div><button className="expand-btn" onClick={()=>{ if(expanded!==i) track("scam_view",`Read scam example: ${scam.title}`.slice(0,200)); setExpanded(expanded===i?null:i); }}>{expanded===i?"Close":"See warning signs"} <ChevronRight size={16}/></button></div><div className="fake-message"><div className="fake-message-label"><MailWarning size={14}/> EXAMPLE OF A SUSPICIOUS MESSAGE</div>“{scam.example}”</div>{expanded===i && <div className="scam-details"><div><b>Why this is suspicious</b>{(scam.warningSigns || []).map((x,j)=><span className="warning-line" key={j}><AlertTriangle size={15}/>{x}</span>)}</div><div className="safe-action"><b><CheckCircle2 size={16}/> Safer action</b><p>{scam.safeAction}</p></div></div>}</article>)}</div>
  </div>;
}
function QuizPage({ quizzes, user, navigate }) {
  const [quizId, setQuizId] = useState("starter-quiz");
  const [quiz, setQuiz] = useState(starterQuiz);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    // The built-in quiz is the reliable default. A published database quiz may replace it,
    // but a missing API route or malformed response must never blank the page.
    if (quizId === "starter-quiz") {
      setQuiz(starterQuiz);
      setAnswers({});
      setResult(null);
      setError("");
      return () => { active = false; };
    }
    request(`/quizzes/${quizId}`).then(data => {
      const questions = Array.isArray(data?.questions) ? data.questions : [];
      const validQuestions = questions.filter(q => q && q.question && Array.isArray(q.options) && q.options.length >= 2);
      if (!active) return;
      if (!validQuestions.length) throw new Error("This quiz has no valid questions. Showing the starter quiz instead.");
      setQuiz({ ...data, questions: validQuestions });
      setAnswers({});
      setResult(null);
      setError("");
    }).catch(err => {
      if (!active) return;
      setQuiz(starterQuiz);
      setQuizId("starter-quiz");
      setAnswers({});
      setResult(null);
      setError("A published quiz could not be loaded. The built-in quiz is ready to play.");
    });
    return () => { active = false; };
  }, [quizId]);

  const questions = Array.isArray(quiz?.questions) ? quiz.questions : starterQuiz.questions;
  const submit = async () => {
    if (questions.some(q => answers[q.id] === undefined)) {
      setError("Please answer every question before submitting.");
      return;
    }
    setError("");
    // Published quizzes are graded by the API so their answer keys are not sent to the browser.
    if (quizId !== "starter-quiz") {
      if (!user) {
        setError("Sign in to submit this published quiz. You can play the starter quiz without an account.");
        return;
      }
      setSaving(true);
      try {
        const data = await request(`/quizzes/${quizId}/attempt`, {
          method: "POST",
          body: JSON.stringify({ answers: questions.map(q => answers[q.id]) })
        });
        if (!data || !Array.isArray(data.review) || typeof data.score !== "number" || typeof data.total !== "number") {
          throw new Error("The quiz service returned an invalid result. Please try again.");
        }
        setResult(data);
      } catch (err) {
        setError(err.message || "Could not submit this quiz. Please try again.");
      } finally {
        setSaving(false);
      }
      return;
    }

    // Built-in starter quiz is fully playable without a login or backend connection.
    const review = questions.map(q => ({
      question: q.question,
      selectedIndex: answers[q.id],
      answerIndex: q.answerIndex,
      correct: answers[q.id] === q.answerIndex,
      explanation: q.explanation || "Review this topic in the Learn section."
    }));
    const score = review.filter(item => item.correct).length;
    setResult({ score, total: review.length, review });
    if (user) track("quiz_attempt", `${quiz.title || "Everyday Cyber Safety"}: ${score}/${review.length}`, { score, total: review.length });
  };

  return <div className="page-wrap"><PageIntro eyebrow="CYBER CHALLENGE" title="How cyber-aware are you?" desc="Try a short quiz based on situations you may come across in everyday digital life."/>
    {Array.isArray(quizzes) && quizzes.length > 0 && <select className="quiz-select" value={quizId} onChange={e=>setQuizId(e.target.value)}><option value="starter-quiz">Everyday Cyber Safety (Starter)</option>{quizzes.filter(q => q.id !== "starter-quiz").map(q=><option key={q.id} value={q.id}>{q.title}</option>)}</select>}
    {error && <p className="form-error" role="status">{error}</p>}
    <div className="quiz-panel"><div className="quiz-panel-head"><span className="topic-icon"><CircleHelp/></span><div><h2>{quiz?.title || starterQuiz.title}</h2><p>{quiz?.description || starterQuiz.description}</p></div><span className="question-count">{questions.length} QUESTIONS</span></div>
      {result ? <div className="quiz-result"><div className="score-circle"><strong>{Math.round((result.score / Math.max(result.total, 1))*100)}%</strong><small>YOUR SCORE</small></div><h2>{result.score===result.total?"Excellent work!":"Good effort. Keep learning."}</h2><p>You answered {result.score} out of {result.total} questions correctly.</p><div className="review-list">{result.review.map((r,i)=><div className="review-item" key={i}><b>{i+1}. {r.question}</b><span className={r.correct?"correct":"incorrect"}>{r.correct?"Correct":"Review this answer"}</span><p>{r.explanation}</p></div>)}</div><button className="btn btn-primary" onClick={()=>{setResult(null);setAnswers({});setError("");}}>Try again <RefreshCw size={16}/></button></div> : <>
      {questions.map((q,i)=><div className="question" key={q.id || i}><div className="question-label">QUESTION {String(i+1).padStart(2,"0")} / {questions.length}</div><h3>{q.question}</h3><div className="answer-options">{q.options.map((option,j)=><button type="button" key={j} className={answers[q.id]===j?"answer-option chosen":"answer-option"} onClick={()=>{setAnswers(a=>({...a,[q.id]:j}));setError("");}}><span>{String.fromCharCode(65+j)}</span>{option}{answers[q.id]===j&&<CheckCircle2 size={17}/>}</button>)}</div></div>)}
      <button className="btn btn-primary submit-quiz" onClick={submit} disabled={saving}>{saving?"Saving score...":"Submit answers"} <ArrowUpRight size={16}/></button><p className="muted small">You can play without signing in. Sign in is only needed for account-based features.</p>
      </>}</div>
  </div>;
}
const gameModes = [
  { id:"spot", emoji:"🕵️", title:"Scam Spotter", tag:"Find the red flags", color:"peach", description:"Read a message and choose the warning sign that gives it away." },
  { id:"safe", emoji:"🚦", title:"Safe or Risky?", tag:"Make the safe choice", color:"blue", description:"Everyday online situations. Decide what you should do next." },
  { id:"password", emoji:"🔐", title:"Password Power", tag:"Build stronger habits", color:"lilac", description:"Pick the strongest password and learn why it is safer." }
];
const gameRounds = {
  spot: [
    { prompt:"A text says: ‘Your bank account closes in 10 minutes. Click this unknown link to update KYC.’ What is the biggest warning sign?", options:["It creates panic and pushes you to click","It uses the word bank","It arrived as a text message"], answer:0, why:"Scammers create urgency so you act before checking. Contact your bank through its official app or number." },
    { prompt:"A stranger messages: ‘You won a phone! Pay ₹499 delivery fee to claim it.’ What should you notice?", options:["The message has an emoji","It asks for money to claim an unexpected prize","It mentions a phone"], answer:1, why:"Unexpected prizes that require advance fees are a common scam trick. Do not pay." },
    { prompt:"Someone pretending to be support asks you to tell them the OTP you just received. What should you do?", options:["Share it if they sound helpful","Send only half the OTP","Never share an OTP with anyone"], answer:2, why:"An OTP is meant only for you. Real support staff should never ask you to disclose it." },
    { prompt:"A social media account says it is your friend and asks for emergency money, but the writing feels unusual. What is safest?", options:["Send the money quickly","Call your friend using a known number to verify","Ask the account for a QR code"], answer:1, why:"Accounts can be impersonated or taken over. Verify through a separate, trusted channel." }
  ],
  safe: [
    { prompt:"You receive a QR code saying ‘Scan to receive your refund’. What do you do?", options:["Scan and enter your UPI PIN","Do not scan; verify the refund with the company","Forward it to family"], answer:1, why:"You do not need to enter a UPI PIN to receive money. Verify refunds in the official app." },
    { prompt:"A website address has a misspelled brand name and asks for your password. What do you do?", options:["Close it and visit the official site yourself","Try your password once","Share it with a friend"], answer:0, why:"Lookalike domains can steal login details. Type the official address yourself or use its app." },
    { prompt:"A caller says they are from a bank and asks for your card PIN. What is safest?", options:["Tell them if they know your name","Hang up and call the official bank number","Give an old PIN"], answer:1, why:"Never share your PIN, password or OTP on a call. Call the bank using a trusted number." },
    { prompt:"You want to install a new app. Which choice is safer?", options:["Use an official app store and check the developer","Install a file sent by a stranger","Choose the first pop-up ad"], answer:0, why:"Official stores and verified developers reduce risk. Review permissions and ratings too." }
  ],
  password: [
    { prompt:"Which password is the strongest choice?", options:["kunal123","P@ssword1","Mango!River7-Candle?Train"], answer:2, why:"A long, unique passphrase is harder to guess. Never reuse it across important accounts." },
    { prompt:"What is the best way to handle passwords for different accounts?", options:["Use one password everywhere","Use unique passwords; consider a trusted password manager","Write them in a public note"], answer:1, why:"Unique passwords stop one leaked password from unlocking several accounts." },
    { prompt:"A friend asks you to share your email password. What should you do?", options:["Share it just this once","Send it in a disappearing message","Keep it private and help them create their own account"], answer:2, why:"Passwords are private. Help others without giving away access to your account." },
    { prompt:"What extra step can protect an account even if a password is stolen?", options:["Multi-factor authentication (MFA)","Using your birthday as a hint","Turning off account alerts"], answer:0, why:"MFA asks for another proof of identity, making account takeovers harder." }
  ]
};
function GameZone() {
  const [mode, setMode] = useState(null); const [round, setRound] = useState(0);
  const [choice, setChoice] = useState(null); const [score, setScore] = useState(0); const [finished, setFinished] = useState(false);
  const rounds = mode ? gameRounds[mode] : []; const current = rounds[round];
  const start = id => { setMode(id); setRound(0); setChoice(null); setScore(0); setFinished(false); };
  const choose = index => { if (choice !== null) return; setChoice(index); if (index === current.answer) setScore(v => v + 1); };
  const next = () => { if (round + 1 >= rounds.length) setFinished(true); else { setRound(v => v + 1); setChoice(null); } };
  return <div className="page-wrap game-page"><PageIntro eyebrow="PLAY • PRACTISE • PROTECT" title="Cyber safety playground" desc="Learn by playing! These short games use everyday examples. No account or personal information is needed."/>
    {!mode ? <><div className="game-welcome"><div><span className="game-kicker">YOUR MISSION</span><h2>Can you outsmart an online scam?</h2><p>Choose a game, collect points and learn a safer action after every answer.</p></div><div className="game-welcome-emoji" aria-hidden="true">🎮🛡️</div></div>
      <div className="game-cards">{gameModes.map((g,i)=><button key={g.id} className={`game-card ${g.color}`} onClick={() => start(g.id)}><span className="game-emoji">{g.emoji}</span><span className="game-tag">GAME 0{i+1} · {g.tag}</span><strong>{g.title}</strong><span className="game-description">{g.description}</span><span className="game-play">Play this game <ArrowUpRight size={17}/></span></button>)}</div>
      <div className="game-friendly"><span>👓</span><div><b>Easy to read, easy to play</b><p>Large buttons, plain language and short rounds. You can play at your own pace.</p></div></div></> : <section className="game-play-panel">
      <div className="game-play-top"><button className="game-back" onClick={() => setMode(null)}>← All games</button><span>{gameModes.find(g=>g.id===mode)?.emoji} {gameModes.find(g=>g.id===mode)?.title}</span><span className="game-score">⭐ {score} points</span></div>
      {finished ? <div className="game-finish"><div className="game-finish-emoji">{score===rounds.length?"🏆":"🌟"}</div><span className="game-kicker">MISSION COMPLETE</span><h2>{score===rounds.length?"Perfect score!":"Great practice!"}</h2><p>You got <b>{score} out of {rounds.length}</b> correct. Every round helps you make safer choices online.</p><div className="game-finish-actions"><button className="btn btn-primary" onClick={() => start(mode)}>Play again <RefreshCw size={16}/></button><button className="btn btn-outline" onClick={() => setMode(null)}>Choose another game</button></div></div> : <><div className="game-progress"><span>ROUND {round+1} OF {rounds.length}</span><div><i style={{width:`${((round+1)/rounds.length)*100}%`}}/></div></div>
        <div className="game-question"><span className="game-question-emoji">{mode==="spot"?"🔎":mode==="safe"?"🚦":"🧠"}</span><h2>{current.prompt}</h2><div className="game-options">{current.options.map((option,i)=><button key={i} disabled={choice!==null} onClick={() => choose(i)} className={`game-option ${choice===i?(i===current.answer?"right":"wrong"):choice!==null&&i===current.answer?"reveal":""}`}><span>{String.fromCharCode(65+i)}</span>{option}{choice!==null&&i===current.answer&&<CheckCircle2 size={20}/>}</button>)}</div>
        {choice!==null&&<div className={choice===current.answer?"game-feedback good":"game-feedback try-again"}><b>{choice===current.answer?"Brilliant! That's the safer choice.":"Good try! Here's the safer choice."}</b><p>{current.why}</p><button className="btn btn-primary" onClick={next}>{round+1===rounds.length?"See my score":"Next round"} <ArrowUpRight size={16}/></button></div>}</div></>}</section>}
  </div>;
}

function LinkChecker() {
  const [url,setUrl]=useState(""); const [result,setResult]=useState(null); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  const check=async e=>{e.preventDefault();setBusy(true);setError("");setResult(null);try{setResult(await request("/check-url",{method:"POST",body:JSON.stringify({url})}));}catch(err){setError(err.message);}finally{setBusy(false);}};
  return <div className="page-wrap"><PageIntro eyebrow="LINK CHECKER" title="Pause before you open a link" desc="Enter a web address to check for a few common warning signs. This tool cannot certify that a website is safe."/>
    <div className="checker-layout"><form className="checker-card" onSubmit={check}><div className="checker-icon"><Link2 size={25}/></div><h2>Review a suspicious URL</h2><p>Paste the complete web address below, including https:// or http://.</p><label htmlFor="url-input">Website address</label><div className="url-input"><Globe2 size={18}/><input id="url-input" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com" required/></div><button className="btn btn-primary full" disabled={busy}>{busy?"Checking...":"Check URL"} <ArrowUpRight size={16}/></button>{error&&<p className="form-error">{error}</p>}
    {result&&<div className="url-result"><div className="result-status"><span className={result.flags.length?"status-warning":"status-caution"}>{result.flags.length?<AlertTriangle size={18}/>:<Eye size={18}/>}</span><div><b>{result.status}</b><small>{result.host}</small></div></div>{result.flags.length?result.flags.map((f,i)=><p className="warning-line" key={i}><AlertTriangle size={15}/>{f}</p>):<p className="muted">No obvious warning was found by these basic checks.</p>}<div className="result-note">{result.note}</div></div>}
    </form><aside className="checker-aside"><h3>Remember these safety basics</h3>{["Check the spelling of the domain name.","HTTPS does not mean a website is genuine.","Never enter an OTP or UPI PIN to claim a prize or refund.","When in doubt, open the official app yourself."].map((x,i)=><div className="aside-tip" key={i}><CheckCircle2 size={17}/>{x}</div>)}<div className="privacy-note"><LockKeyhole size={17}/><span><b>Use your judgement</b><small>This checker provides basic hints only. Do not submit private information or assume a clean result means a link is safe.</small></span></div></aside></div>
  </div>;
}
function EmergencyPage() {
  const steps=[["Stop interacting","Do not send more money, share OTPs or PINs, install apps, or follow further instructions from the suspected scammer."],["Contact your bank or payment provider","Use the official app or the phone number printed on your card or official website. Ask them to block or secure affected accounts, cards or UPI access."],["Report financial cyber fraud promptly","In India, call 1930 as soon as possible for financial cyber fraud. Also submit a complaint at the National Cyber Crime Reporting Portal: cybercrime.gov.in."],["Secure affected accounts","Change compromised passwords from a trusted device. Sign out of unknown sessions, enable two-step verification and contact your mobile provider if your SIM may be affected."],["Preserve evidence","Keep transaction IDs, bank messages, phone numbers, URLs, screenshots, emails and complaint references. Do not edit or delete the original evidence."],["Tell someone you trust","Scams can happen to anyone. Ask a trusted person to help you contact the bank, service provider or authorities if needed."]];
  return <div className="page-wrap"><PageIntro eyebrow="EMERGENCY SUPPORT" title="Think you've been scammed?" desc="Take a breath. You are not alone. Acting quickly can help limit further harm. Follow these steps."/>
    <div className="urgent-callout"><div className="urgent-icon"><PhoneIcon/></div><div><b>Financial cyber fraud in India?</b><p>Call the national cyber fraud helpline as soon as possible.</p></div><a href="tel:1930" className="helpline">1930 <ExternalLink size={15}/></a></div>
    <div className="steps-list">{steps.map((s,i)=><div className="emergency-step" key={i}><span className="step-number">{String(i+1).padStart(2,"0")}</span><div><h3>{s[0]}</h3><p>{s[1]}</p></div></div>)}</div>
    <div className="official-links"><h3>Official reporting resources</h3><a href="https://cybercrime.gov.in/" target="_blank" rel="noreferrer"><span><ShieldCheck/> National Cyber Crime Reporting Portal</span><ExternalLink size={16}/></a><a href="https://www.rbi.org.in/" target="_blank" rel="noreferrer"><span><LandmarkIcon/> Reserve Bank of India</span><ExternalLink size={16}/></a><p>For immediate danger or threats to personal safety, contact local emergency services. Reporting guidance is general information and does not replace advice from your bank, service provider or law enforcement.</p></div>
  </div>;
}
function PhoneIcon(){return <span className="phone-symbol">1930</span>}
function LandmarkIcon(){return <ShieldCheck size={18}/>}
function AuthPage({mode,onSuccess,switchMode}) {
  const [name,setName]=useState("");const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [show,setShow]=useState(false);const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const submit=async e=>{
    e.preventDefault();setError("");
    const cleanEmail=email.trim();
    if(mode==="register"&&!name.trim()) return setError("Please enter your name.");
    if(!/^\S+@\S+\.\S+$/.test(cleanEmail)) return setError("Please enter a valid email address.");
    if(password.length<8) return setError("Password must be at least 8 characters.");
    setBusy(true);
    const payload={name,email:cleanEmail,password};
    try{
      const data=await request(`/auth/${mode}`,{method:"POST",body:JSON.stringify(payload)});
      onSuccess(data);
    }catch(err){setError(err.message||"Something went wrong. Please try again.");}
    finally{setBusy(false);}
  };
  return <div className="auth-wrap"><div className="auth-art"><span className="brand-mark large"><ShieldCheck size={36}/></span><div className="eyebrow light">YOUR DIGITAL SAFETY COMPANION</div><h2>Confidence begins with awareness.</h2><p>Learn simple habits that help protect your identity, money and personal information online.</p><div className="auth-art-bottom"><ShieldCheck size={17}/> A safer digital community, together.</div></div><form className="auth-card" onSubmit={submit} noValidate><span className="eyebrow">{mode==="login"?"WELCOME BACK":"GET STARTED"}</span><h1>{mode==="login"?"Sign in to Cyber Saathi":"Create your account"}</h1><p>{mode==="login"?"Continue building safer digital habits.":"Join the community and keep learning."}</p>{mode==="register"&&<label>Full name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" required maxLength={80}/></label>}<label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required/></label><label>Password<span className="password-field"><input type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={mode==="login"?"current-password":"new-password"} required minLength={8}/><button type="button" aria-label={show?"Hide password":"Show password"} onClick={()=>setShow(!show)}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></span></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="btn btn-primary full" disabled={busy}>{busy?"Please wait...":mode==="login"?"Sign in":"Create account"} <ArrowUpRight size={16}/></button><p className="auth-switch">{mode==="login"?"New to Cyber Saathi?":"Already have an account?"} <button type="button" onClick={switchMode}>{mode==="login"?"Create an account":"Sign in"}</button></p><div className="auth-note"><LockKeyhole size={14}/> Your password is securely hashed before storage.</div></form></div>;
}
function AuthPrompt({navigate,admin}) {return <div className="empty-state"><span className="empty-icon"><LockKeyhole/></span><h2>{admin?"Administrator sign in required":"Sign in to continue"}</h2><p>{admin?"Only authorized administrator accounts can access the admin dashboard.":"Create an account or sign in to save your quiz progress."}</p><button className="btn btn-primary" onClick={()=>navigate("login")}>Go to sign in <ArrowUpRight size={16}/></button></div>;}
function UserDashboard({user,navigate,logout}) {
  const [stats,setStats]=useState({attempts:0,average:0});
  useEffect(()=>{request("/me/stats").then(setStats).catch(()=>{});},[]);
  return <div className="page-wrap"><PageIntro eyebrow="MY SPACE" title={`Welcome, ${user.name.split(" ")[0]}`} desc="Your personal space to keep learning and build safer online habits."/><div className="stats-grid"><Stat icon={<CircleHelp/>} label="Quizzes attempted" value={stats.attempts}/><Stat icon={<Activity/>} label="Average score" value={`${stats.average}%`}/><Stat icon={<ShieldCheck/>} label="Learning status" value="In progress"/></div><div className="dashboard-actions"><FeatureCard icon={<BookOpen/>} number="01" title="Explore safety guides" desc="Read practical information about common online threats." action="Open learning hub" onClick={()=>navigate("learn")}/><FeatureCard icon={<CircleHelp/>} number="02" title="Test your knowledge" desc="Take a short quiz and see what you have learned." action="Start a quiz" onClick={()=>navigate("quiz")}/><FeatureCard icon={<HeartHandshake/>} number="03" title="Get help" desc="Find the steps to take if you suspect a cyber scam." action="Emergency guidance" onClick={()=>navigate("emergency")}/></div><button className="btn btn-outline logout-btn" onClick={logout}><LogOut size={16}/> Sign out</button></div>;
}
function Stat({icon,label,value}) {return <div className="stat-card"><span>{icon}</span><small>{label}</small><strong>{value}</strong></div>}

function EmptyState({title,text}) {return <div className="empty-state"><span className="empty-icon"><Search/></span><h2>{title}</h2><p>{text}</p></div>}
function Footer({navigate}) {
  return <footer className="footer"><div className="footer-main"><div className="footer-brand"><span className="brand-mark"><ShieldCheck/></span><div><b>cyber<span>saathi</span></b><small>STAY ALERT. STAY SAFE.</small></div><p>Helping people make safer choices in a connected world.</p></div><div><b>Explore</b><button onClick={()=>navigate("learn")}>Awareness hub</button><button onClick={()=>navigate("scams")}>Scam library</button><button onClick={()=>navigate("quiz")}>Cyber quiz</button></div><div><b>Get support</b><button onClick={()=>navigate("link-check")}>Link checker</button><button onClick={()=>navigate("emergency")}>Emergency help</button><a href="https://cybercrime.gov.in/" target="_blank" rel="noreferrer">Report cybercrime <ExternalLink size={13}/></a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Cyber Saathi · Community awareness project</span><span>Learn. Verify. Protect.</span></div></footer>;
}

export default App;
