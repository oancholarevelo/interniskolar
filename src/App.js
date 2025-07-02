import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import {
  PlusCircle,
  Edit,
  Trash2,
  FileText,
  LogOut,
  Building,
  Users,
  Clock,
  Search,
  X,
  Mail,
  AlertTriangle,
  CheckCircle,
  BookOpen,
  Star,
  Menu,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import "./App.css";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAIc6oFOBknpItFeHuw9qMhrNOzNjns5kk",
  authDomain: "pup-internship.firebaseapp.com",
  projectId: "pup-internship",
  storageBucket: "pup-internship.appspot.com",
  messagingSenderId: "742208522282",
  appId: "1:742208522282:web:7b4e0e4f8c8e3f3ed75b53",
  measurementId: "G-JZDCXXLHJ8",
};

// --- Helper function for cleaning and normalizing course names ---
const normalizeCourse = (courseName) => {
  if (!courseName) return "";
  const upperCaseName = courseName.trim().toUpperCase();
  if (["DCET", "DCPET"].includes(upperCaseName)) return "DCPET";
  if (["DEET"].includes(upperCaseName)) return "DEET";
  if (["DOM-LOMT", "DOMT", "DOMT-LOMT", "DOMTLOMT"].includes(upperCaseName))
    return "DOMT";
  return upperCaseName;
};

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [htes, setHtes] = useState([]);
  const [allHtes, setAllHtes] = useState([]);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [storage, setStorage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHte, setEditingHte] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contactPerson: "",
    contactNumber: "",
    email: "",
    moaEndDate: "",
    course: "",
    moaLink: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showExpired, setShowExpired] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("All");

  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      const firebaseAuth = getAuth(app);
      const firebaseStorage = getStorage(app);
      setDb(firestoreDb);
      setAuth(firebaseAuth);
      setStorage(firebaseStorage);

      const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          const adminEmailsForTesting = [
            "oliverarevelo@iskolarngbayan.pup.edu.ph",
          ];
          const isTestAdmin = adminEmailsForTesting.includes(currentUser.email);
          const isDomainAdmin = currentUser.email.endsWith("@pup.edu.ph");
          setIsAdmin(isDomainAdmin || isTestAdmin);
        } else {
          setIsAdmin(false);
          setProfile(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      if (error.code !== "duplicate-app") setLoading(false);
    }
  }, []);

  // Fetch user profile data (including shortlist)
  useEffect(() => {
    if (user && db) {
      const profileDocRef = doc(db, "profiles", user.uid);
      const unsubscribe = onSnapshot(profileDocRef, (doc) => {
        setProfile(
          doc.exists() ? doc.data() : { name: "", resumeUrl: "", shortlist: [] }
        );
      });
      return () => unsubscribe();
    }
  }, [user, db]);

  useEffect(() => {
    if (!db || !user || !user.emailVerified) return;
    const hteCollection = collection(db, "htes");
    const unsubscribe = onSnapshot(
      hteCollection,
      (snapshot) => {
        const fullList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        fullList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setAllHtes(fullList);
        if (isAdmin) {
          setHtes(fullList);
        } else {
          const activeList = fullList.filter((hte) =>
            hte.moaEndDate ? hte.moaEndDate.toDate() >= new Date() : false
          );
          setHtes(activeList);
        }
      },
      (error) => console.error("Error fetching HTEs:", error)
    );
    return () => unsubscribe();
  }, [db, user, isAdmin]);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      setPage("dashboard");
    }
  };

  const openModal = (hte = null) => {
    if (hte) {
      setEditingHte(hte);
      setFormData({
        name: hte.name || "",
        address: hte.address || "",
        contactPerson: hte.contactPerson || "",
        contactNumber: hte.contactNumber || "",
        email: hte.email || "",
        course: hte.course || "",
        moaEndDate: hte.moaEndDate?.toDate().toISOString().split("T")[0] || "",
        moaLink: hte.moaLink || "",
      });
    } else {
      setEditingHte(null);
      setFormData({
        name: "",
        address: "",
        contactPerson: "",
        contactNumber: "",
        email: "",
        moaEndDate: "",
        course: "",
        moaLink: "",
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);
  const handleFormChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!db) return;
    const moaEndDateTimestamp = formData.moaEndDate
      ? Timestamp.fromDate(new Date(formData.moaEndDate))
      : null;
    const hteData = { ...formData, moaEndDate: moaEndDateTimestamp };
    try {
      if (editingHte) await setDoc(doc(db, "htes", editingHte.id), hteData);
      else await addDoc(collection(db, "htes"), hteData);
      closeModal();
    } catch (error) {
      console.error("Error saving HTE:", error);
      alert("Failed to save HTE.");
    }
  };

  const handleDelete = async (id) => {
    if (!db || !window.confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, "htes", id));
    } catch (error) {
      console.error("Error deleting HTE:", error);
      alert("Failed to delete HTE.");
    }
  };

  const handleShortlistToggle = async (hteId) => {
    if (!user || !db) return;
    const profileDocRef = doc(db, "profiles", user.uid);
    const isShortlisted = profile?.shortlist?.includes(hteId);
    try {
      if (isShortlisted) {
        await updateDoc(profileDocRef, { shortlist: arrayRemove(hteId) });
      } else {
        await updateDoc(profileDocRef, { shortlist: arrayUnion(hteId) });
      }
    } catch (error) {
      console.error("Error updating shortlist:", error);
      if (error.code === "not-found") {
        await setDoc(profileDocRef, { shortlist: [hteId] }, { merge: true });
      }
    }
  };

  const filteredHtes = htes.filter((hte) => {
    const name = hte.name || "";
    const address = hte.address || "";
    const hteCourses = (hte.course || "").split(/[/,]/).map(normalizeCourse);
    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse =
      selectedCourse === "All" ||
      hteCourses.includes(normalizeCourse(selectedCourse));
    if (isAdmin) {
      const isExpired = hte.moaEndDate?.toDate() < new Date();
      const matchesExpiry = showExpired ? isExpired : !isExpired;
      return matchesSearch && matchesCourse && matchesExpiry;
    }
    return matchesSearch && matchesCourse;
  });

  if (loading)
    return (
      <div className="loading-screen">
        <div className="loading-text">Loading Portal...</div>
      </div>
    );
  if (!user) return <AuthScreen auth={auth} />;
  if (!user.emailVerified)
    return <VerifyEmailScreen user={user} onLogout={handleLogout} />;

  return (
    <div className="app-container">
      <Navbar
        user={user}
        onLogout={handleLogout}
        setPage={setPage}
        isAdmin={isAdmin}
      />
      <main className="main-content">
        {page === "dashboard" && (
          <Dashboard
            htes={filteredHtes}
            allHtes={allHtes}
            isAdmin={isAdmin}
            profile={profile}
            openModal={openModal}
            handleDelete={handleDelete}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            showExpired={showExpired}
            setShowExpired={setShowExpired}
            selectedCourse={selectedCourse}
            setSelectedCourse={setSelectedCourse}
            onShortlistToggle={handleShortlistToggle}
          />
        )}
        {page === "templates" && <TemplatesSection />}
        {page === "profile" && (
          <ProfilePage
            user={user}
            profile={profile}
            db={db}
            storage={storage}
          />
        )}
        {page === "shortlist" && (
          <ShortlistPage
            allHtes={allHtes}
            profile={profile}
            onShortlistToggle={handleShortlistToggle}
          />
        )}
      </main>
      {isModalOpen && isAdmin && (
        <HteFormModal
          closeModal={closeModal}
          formData={formData}
          handleFormChange={handleFormChange}
          handleFormSubmit={handleFormSubmit}
          editingHte={editingHte}
        />
      )}
    </div>
  );
}

// --- Authentication & Profile Components ---

function AuthScreen({ auth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (
      !email.endsWith("@pup.edu.ph") &&
      !email.endsWith("@iskolarngbayan.pup.edu.ph")
    ) {
      setError(
        "Please use a valid school email address (@pup.edu.ph or @iskolarngbayan.pup.edu.ph)."
      );
      return;
    }
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        await sendEmailVerification(userCredential.user);
        setMessage(
          "Verification email sent! Please check your inbox to continue."
        );
        await signOut(auth);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-container">
        <div className="auth-header">
          <Briefcase className="auth-icon" />
          <h1>OJT Portal</h1>
          <p>{isLogin ? "Sign in to your account" : "Create a new account"}</p>
        </div>
        <form onSubmit={handleAuthAction} className="auth-form">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="School Email Address"
            required
            className="auth-input"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="auth-input"
          />
          {error && (
            <div className="alert error">
              <AlertTriangle className="alert-icon" />
              {error}
            </div>
          )}
          {message && (
            <div className="alert success">
              <CheckCircle className="alert-icon" />
              {message}
            </div>
          )}
          <button type="submit" className="auth-button">
            {isLogin ? "Login" : "Register"}
          </button>
        </form>
        <p className="auth-toggle-text">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setMessage("");
            }}
            className="auth-toggle-button"
          >
            {isLogin ? "Sign Up" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}

function VerifyEmailScreen({ user, onLogout }) {
  const [message, setMessage] = useState("");
  const resendVerification = async () => {
    try {
      await sendEmailVerification(user);
      setMessage("A new verification email has been sent.");
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };
  return (
    <div className="verify-screen">
      <div className="verify-container">
        <Mail className="verify-icon" />
        <h1>Verify Your Email</h1>
        <p>
          A verification link has been sent to{" "}
          <span className="bold-text">{user.email}</span>. Please check your
          inbox (and spam folder) and click the link to activate your account.
        </p>
        <p className="verify-subtext">
          You can close this tab after verifying.
        </p>
        {message && <div className="alert success">{message}</div>}
        <div className="verify-actions">
          <button onClick={onLogout} className="btn btn-danger">
            Logout
          </button>
          <button onClick={resendVerification} className="btn btn-primary">
            Resend Email
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfilePage({ user, profile, db, storage }) {
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
    }
  }, [profile]);

  const handleFileChange = (e) => {
    if (e.target.files[0] && e.target.files[0].type === "application/pdf") {
      setFile(e.target.files[0]);
      setMessage("");
    } else {
      setFile(null);
      setMessage("Please select a PDF file.");
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!db || !user) return;

    const profileDocRef = doc(db, "profiles", user.uid);

    try {
      await setDoc(profileDocRef, { name: name }, { merge: true });

      if (file) {
        const storageRef = ref(storage, `resumes/${user.uid}/${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            console.error("Upload error:", error);
            setMessage("Error uploading file.");
          },
          () => {
            getDownloadURL(uploadTask.snapshot.ref).then(
              async (downloadURL) => {
                await setDoc(
                  profileDocRef,
                  { resumeUrl: downloadURL, resumeFileName: file.name },
                  { merge: true }
                );
                setMessage("Profile updated successfully!");
                setFile(null);
                setUploadProgress(0);
              }
            );
          }
        );
      } else {
        setMessage("Profile name updated!");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage("Error updating profile.");
    }
  };

  return (
    <div>
      <h1>Your Profile</h1>
      <div className="profile-container">
        <form onSubmit={handleProfileUpdate} className="profile-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input type="email" id="email" value={user.email} disabled />
          </div>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="resume">Upload Resume (PDF only)</label>
            <input
              type="file"
              id="resume"
              onChange={handleFileChange}
              accept=".pdf"
            />
            {uploadProgress > 0 && (
              <progress value={uploadProgress} max="100" />
            )}
            {profile?.resumeUrl && (
              <p className="current-resume">
                Current Resume:{" "}
                <a
                  href={profile.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {profile.resumeFileName || "View Resume"}
                </a>
              </p>
            )}
          </div>
          {message && (
            <div
              className={`alert ${
                message.includes("Error") ? "error" : "success"
              }`}
            >
              {message}
            </div>
          )}
          <button type="submit" className="btn btn-primary">
            Save Profile
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Other Components ---

function Navbar({ user, onLogout, setPage, isAdmin }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    setIsMenuOpen(false);
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Briefcase className="navbar-icon" />
          <span>OJT Portal</span>
        </div>
        <nav className={`navbar-nav ${isMenuOpen ? "open" : ""}`}>
          <button
            onClick={() => handlePageChange("dashboard")}
            className="nav-link"
          >
            Dashboard
          </button>
          {!isAdmin && (
            <button
              onClick={() => handlePageChange("shortlist")}
              className="nav-link"
            >
              Shortlist
            </button>
          )}
          <button
            onClick={() => handlePageChange("templates")}
            className="nav-link"
          >
            Templates
          </button>
          {!isAdmin && (
            <button
              onClick={() => handlePageChange("profile")}
              className="nav-link"
            >
              Profile
            </button>
          )}
        </nav>
        <div className="navbar-user-section">
          <div className="user-info">
            <span className="user-email">{user.email}</span>
            {isAdmin && <span className="admin-badge">ADMIN</span>}
          </div>
          <button onClick={onLogout} className="logout-button" title="Logout">
            <LogOut size={20} />
          </button>
          <button
            className="hamburger-menu"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function Dashboard({
  htes,
  allHtes,
  isAdmin,
  profile,
  openModal,
  handleDelete,
  searchTerm,
  setSearchTerm,
  showExpired,
  setShowExpired,
  selectedCourse,
  setSelectedCourse,
  onShortlistToggle,
}) {
  const courses = [
    "All",
    ...new Set(
      allHtes
        .flatMap((hte) => (hte.course || "").split(/[/,]/))
        .map(normalizeCourse)
        .filter(
          (course) =>
            course && course.toUpperCase() !== "ALL ENGINEERING COURSET"
        )
    ),
  ].sort();

  return (
    <div>
      <div className="dashboard-header">
        <h1>Host Training Establishments</h1>
        {isAdmin && (
          <button
            onClick={() => openModal()}
            className="btn btn-primary add-hte-btn"
          >
            <PlusCircle size={20} /> Add New HTE
          </button>
        )}
      </div>
      <div className="search-filter-bar">
        <div className="search-container">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search by company name or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <select
          className="course-filter"
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
        >
          {courses.map((course) => (
            <option key={course} value={course}>
              {course}
            </option>
          ))}
        </select>
        {isAdmin && (
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={showExpired}
              onChange={(e) => setShowExpired(e.target.checked)}
            />
            <span className="slider"></span>
            <span className="toggle-label">Show Expired</span>
          </label>
        )}
      </div>
      <div className="hte-grid">
        {htes.length > 0 ? (
          htes.map((hte) => (
            <HteCard
              key={hte.id}
              hte={hte}
              isAdmin={isAdmin}
              profile={profile}
              onEdit={openModal}
              onDelete={handleDelete}
              onShortlistToggle={onShortlistToggle}
            />
          ))
        ) : (
          <p className="no-results">No HTEs found that match your criteria.</p>
        )}
      </div>
    </div>
  );
}

function HteCard({
  hte,
  isAdmin,
  profile,
  onEdit,
  onDelete,
  onShortlistToggle,
}) {
  const isExpired = hte.moaEndDate?.toDate() < new Date();
  const isShortlisted = !isAdmin && profile?.shortlist?.includes(hte.id);

  const cardClasses = `hte-card ${isExpired ? "expired" : "active"}`;
  const headerClasses = `hte-card-header ${
    isExpired ? "expired-bg" : "active-bg"
  }`;
  const expiryTextClasses = `expiry-text ${
    isExpired ? "expired-text" : "active-text"
  }`;

  const createGmailLink = () => {
    const studentName =
      profile?.name || "[Your Full Name - Please update in Profile]";
    const companyName = hte.name;
    const contactPerson = hte.contactPerson || "Hiring Manager";
    const to = hte.email;
    const subject = `Internship Application - ${studentName}`;

    let resumeLine = "";
    if (profile?.resumeUrl) {
      resumeLine = `You can view my resume here: ${profile.resumeUrl}`;
    } else {
      resumeLine = "I would be happy to provide my resume upon your request.";
    }

    const body = `Dear ${contactPerson},\n\nI hope this email finds you well.\n\nMy name is ${studentName}, and I am a student from Polytechnic University of the Philippines. I am writing to express my strong interest in an internship opportunity at ${companyName}, which I found on our school's OJT portal.\n\n${resumeLine}\n\nThank you for your time and consideration.\n\nSincerely,\n${studentName}`;

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      to
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return gmailUrl;
  };

  return (
    <div className={cardClasses}>
      {!isAdmin && (
        <button
          className={`shortlist-btn ${isShortlisted ? "shortlisted" : ""}`}
          onClick={() => onShortlistToggle(hte.id)}
          title={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
        >
          <Star size={20} />
        </button>
      )}
      <div className={headerClasses}>
        <h3>
          <Building size={24} /> {hte.name}
        </h3>
        <p>{hte.address}</p>
      </div>
      <div className="hte-card-body">
        <p>
          <Users size={16} /> <span>{hte.contactPerson || "N/A"}</span>
        </p>
        <p>
          <Briefcase size={16} />{" "}
          <span>
            {hte.contactNumber || "N/A"} | {hte.email || "N/A"}
          </span>
        </p>
        <p>
          <BookOpen size={16} /> <span>{hte.course || "Any Course"}</span>
        </p>
        <p className={expiryTextClasses}>
          <Clock size={16} />{" "}
          <span>
            MOA Expires:{" "}
            {hte.moaEndDate
              ? hte.moaEndDate.toDate().toLocaleDateString()
              : "N/A"}
          </span>
        </p>
      </div>
      <div className="hte-card-footer">
        {hte.moaLink && (
          <a
            href={hte.moaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary moa-btn"
          >
            <ExternalLink size={16} /> View MOA
          </a>
        )}
        <a
          href={createGmailLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-success email-btn"
        >
          <Mail size={16} /> Email Company
        </a>
        {isAdmin && (
          <div className="admin-actions">
            <button onClick={() => onEdit(hte)} className="icon-btn">
              <Edit size={20} />
            </button>
            <button
              onClick={() => onDelete(hte.id)}
              className="icon-btn danger"
            >
              <Trash2 size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ShortlistPage({ allHtes, profile, onShortlistToggle }) {
  const shortlistedIds = profile?.shortlist || [];
  const shortlistedHtes = allHtes.filter((hte) =>
    shortlistedIds.includes(hte.id)
  );

  return (
    <div>
      <h1>Your Shortlisted Companies</h1>
      {shortlistedHtes.length > 0 ? (
        <div className="hte-grid">
          {shortlistedHtes.map((hte) => (
            <HteCard
              key={hte.id}
              hte={hte}
              isAdmin={false}
              profile={profile}
              onShortlistToggle={onShortlistToggle}
            />
          ))}
        </div>
      ) : (
        <p className="no-results">
          You haven't shortlisted any companies yet. Click the star icon on a
          company to add it to this list.
        </p>
      )}
    </div>
  );
}

function TemplatesSection() {
  const templates = [
    {
      name: "OJT-MOA HTE x PUP_VPAA_2024",
      url: "/templates/OJT-MOA HTE x PUP_VPAA_2024.docx",
    },
    {
      name: "PUP Internship Agreement 2024",
      url: "/templates/PUP Internship Agreement 2024.docx",
    },
    {
      name: "PUP Consent Form 2024",
      url: "/templates/PUP Consent Form_2024.docx",
    },
    {
      name: "Declaration of Medical Information and Data Subject Consent Form",
      url: "/templates/Declaration-of-Medical-Information-and-Data-Subject-Consent-Form.pdf",
    },
    {
      name: "Intent Letter (for 1 student)",
      url: "/templates/Intent Letter_for 1 student.docx",
    },
    {
      name: "Intent Letter (for 2 or more students)",
      url: "/templates/Intent Letter_for 2 or more students.docx",
    },
    {
      name: "PUP Medical Health Information Form for Students 2022",
      url: "/templates/PUP-Medical-Health-Information-Form-for-Students-2022.pdf",
    },
    {
      name: "Daily Time Record (DTR)",
      url: "/templates/Daily Time Record (DTR).docx",
    },
    {
      name: "Weekly Accomplishment Report Template",
      url: "/templates/Weekly Accomplishment Report_Template.docx",
    },
    {
      name: "Evaluation Instrument for Training Supervisor",
      url: "/templates/EVALUATION-INSTRUMENT-for-TRAINING-SUPERVISOR_FINAL.docx",
    },
    {
      name: "Evaluation Instrument for HTE (for Students)",
      url: "/templates/Evaluation-Instrument-for-HTE_Final-FOR-STUDENTS.docx",
    },
    {
      name: "Overtime Agreement Template",
      url: "/templates/OVERTIME AGREEMENT TEMPLATE.docx",
    },
    {
      name: "Guidelines for Submission of OJT Portfolio",
      url: "/templates/GUIDELINES-FOR-SUBMISSION-OF-OJT-PORTFOLIO.pdf",
    },
    { name: "Insurance Information", url: "/templates/insurance.pdf" },
  ];
  return (
    <div>
      <h1>Downloadable Templates</h1>
      <div className="templates-container">
        <ul>
          {templates.map((template, index) => (
            <li key={index}>
              <div>
                <FileText className="template-icon" />
                <span>{template.name}</span>
              </div>
              <a href={template.url} download className="btn btn-success">
                Download
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function HteFormModal({
  closeModal,
  formData,
  handleFormChange,
  handleFormSubmit,
  editingHte,
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{editingHte ? "Edit HTE" : "Add New HTE"}</h2>
          <button onClick={closeModal} className="close-btn">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleFormSubmit}>
          <div className="modal-body">
            <div>
              <label htmlFor="name">Company Name</label>
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleFormChange}
                required
              />
            </div>
            <div>
              <label htmlFor="address">Company Address</label>
              <input
                type="text"
                name="address"
                id="address"
                value={formData.address}
                onChange={handleFormChange}
                required
              />
            </div>
            <div>
              <label htmlFor="course">Course/s</label>
              <input
                type="text"
                name="course"
                id="course"
                value={formData.course}
                onChange={handleFormChange}
                placeholder="e.g., DIT, DCPET, DEET"
              />
            </div>
            <div>
              <label htmlFor="contactPerson">Contact Person</label>
              <input
                type="text"
                name="contactPerson"
                id="contactPerson"
                value={formData.contactPerson}
                onChange={handleFormChange}
                required
              />
            </div>
            <div>
              <label htmlFor="contactNumber">Contact Number</label>
              <input
                type="tel"
                name="contactNumber"
                id="contactNumber"
                value={formData.contactNumber}
                onChange={handleFormChange}
                required
              />
            </div>
            <div>
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleFormChange}
                required
              />
            </div>
            <div>
              <label htmlFor="moaLink">MOA Link</label>
              <input
                type="url"
                name="moaLink"
                id="moaLink"
                value={formData.moaLink}
                onChange={handleFormChange}
                placeholder="https://..."
              />
            </div>
            <div>
              <label htmlFor="moaEndDate">MOA Expiration Date</label>
              <input
                type="date"
                name="moaEndDate"
                id="moaEndDate"
                value={formData.moaEndDate}
                onChange={handleFormChange}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              onClick={closeModal}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingHte ? "Save Changes" : "Add HTE"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
