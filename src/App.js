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
  getDocs,
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
  Heart,
  Send,
  MessageCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  TrendingUp,
  Calendar,
  AlertCircle,
  Eye,
  Activity,
} from "lucide-react";
import { Analytics } from "@vercel/analytics/react";
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
    natureOfBusiness: "",
    moaEndDate: "",
    course: "",
    moaLink: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showExpired, setShowExpired] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("All");
  const [adminAnalytics, setAdminAnalytics] = useState({
    totalStudents: 0,
    expiringHTEs: [],
    mostPopularHTEs: [],
    activeHTEs: 0,
    expiredHTEs: 0,
    applicationStats: {},
  });

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

  // Fetch analytics data for admins
  useEffect(() => {
    if (!isAdmin || !db) return;

    const fetchAnalytics = async () => {
      try {
        // Get all profiles to count students and analyze application data
        const profilesSnapshot = await getDocs(collection(db, "profiles"));
        const profiles = profilesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Count total students
        const totalStudents = profiles.length;
        
        // Analyze application popularity
        const htePopularity = {};
        const applicationStats = {
          Interested: 0,
          Applied: 0,
          Interviewing: 0,
          'Offer Received': 0,
          Rejected: 0,
        };
        
        profiles.forEach(profile => {
          const applications = profile.shortlist || [];
          
          if (applications.length > 0) {
            applications.forEach(app => {
              // Handle both legacy and new format
              if (typeof app === 'string') {
                htePopularity[app] = (htePopularity[app] || 0) + 1;
                applicationStats.Interested++;
              } else if (app.hteId) {
                htePopularity[app.hteId] = (htePopularity[app.hteId] || 0) + 1;
                applicationStats[app.status] = (applicationStats[app.status] || 0) + 1;
              }
            });
          }
        });
        
        // Find most popular HTEs
        const mostPopularHTEs = Object.entries(htePopularity)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([hteId, count]) => ({
            hte: allHtes.find(h => h.id === hteId),
            applications: count
          }))
          .filter(item => item.hte);
        
        // Find HTEs expiring soon
        const now = new Date();
        const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
        const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        
        const expiringHTEs = allHtes
          .filter(hte => hte.moaEndDate && hte.moaEndDate.toDate() > now)
          .map(hte => {
            const expiryDate = hte.moaEndDate.toDate();
            let urgency = 'low';
            if (expiryDate <= thirtyDays) urgency = 'high';
            else if (expiryDate <= sixtyDays) urgency = 'medium';
            else if (expiryDate <= ninetyDays) urgency = 'low';
            
            return {
              ...hte,
              urgency,
              daysUntilExpiry: Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
            };
          })
          .filter(hte => hte.daysUntilExpiry <= 90)
          .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
        
        // Count active vs expired HTEs
        const activeHTEs = allHtes.filter(hte => 
          !hte.moaEndDate || hte.moaEndDate.toDate() >= now
        ).length;
        const expiredHTEs = allHtes.length - activeHTEs;
        
        setAdminAnalytics({
          totalStudents,
          expiringHTEs,
          mostPopularHTEs,
          activeHTEs,
          expiredHTEs,
          applicationStats,
        });
        
      } catch (error) {
        console.error("Error fetching analytics:", error);
      }
    };

    fetchAnalytics();
  }, [isAdmin, db, allHtes]);

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
        natureOfBusiness: hte.natureOfBusiness || "",
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
        natureOfBusiness: "",
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

  const handleApplicationStatusUpdate = async (hteId, newStatus = null) => {
    if (!user || !db) return;
    const profileDocRef = doc(db, "profiles", user.uid);
    
    // Convert legacy shortlist array to new format if needed
    const currentShortlist = profile?.shortlist || [];
    let applications = [];
    
    if (currentShortlist.length > 0 && typeof currentShortlist[0] === 'string') {
      // Legacy format - convert to new format
      applications = currentShortlist.map(id => ({ hteId: id, status: 'Interested' }));
    } else {
      // New format or empty
      applications = currentShortlist.filter(app => typeof app === 'object') || [];
    }
    
    const existingAppIndex = applications.findIndex(app => app.hteId === hteId);
    
    try {
      if (newStatus === null) {
        // Remove from applications (equivalent to old "unshortlist")
        if (existingAppIndex !== -1) {
          applications.splice(existingAppIndex, 1);
        }
      } else {
        // Add or update status
        if (existingAppIndex !== -1) {
          applications[existingAppIndex].status = newStatus;
        } else {
          applications.push({ hteId, status: newStatus });
        }
      }
      
      await updateDoc(profileDocRef, { shortlist: applications });
    } catch (error) {
      console.error("Error updating application status:", error);
      if (error.code === "not-found") {
        await setDoc(profileDocRef, { shortlist: applications }, { merge: true });
      }
    }
  };

  const filteredHtes = htes.filter((hte) => {
    const name = hte.name || "";
    const address = hte.address || "";
    const natureOfBusiness = hte.natureOfBusiness || "";
    const hteCourses = (hte.course || "").split(/[/,]/).map(normalizeCourse);
    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      natureOfBusiness.toLowerCase().includes(searchTerm.toLowerCase());
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
            onApplicationStatusUpdate={handleApplicationStatusUpdate}
          />
        )}
        {page === "analytics" && isAdmin && (
          <AdminAnalytics
            analytics={adminAnalytics}
            allHtes={allHtes}
            openModal={openModal}
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
        {page === "applications" && (
          <ApplicationsPage
            allHtes={allHtes}
            profile={profile}
            onApplicationStatusUpdate={handleApplicationStatusUpdate}
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
      <Analytics />
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
          {isAdmin && (
            <button
              onClick={() => handlePageChange("analytics")}
              className="nav-link"
            >
              Analytics
            </button>
          )}
          {!isAdmin && (
            <button
              onClick={() => handlePageChange("applications")}
              className="nav-link"
            >
              My Applications
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
  onApplicationStatusUpdate,
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
            placeholder="Search by company name, address, or nature of business..."
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
              onApplicationStatusUpdate={onApplicationStatusUpdate}
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
  onApplicationStatusUpdate,
}) {
  const isExpired = hte.moaEndDate?.toDate() < new Date();
  
  // Handle both legacy and new format
  const applications = profile?.shortlist || [];
  let currentApplication = null;
  
  if (applications.length > 0) {
    if (typeof applications[0] === 'string') {
      // Legacy format
      currentApplication = applications.includes(hte.id) ? { hteId: hte.id, status: 'Interested' } : null;
    } else {
      // New format
      currentApplication = applications.find(app => app.hteId === hte.id) || null;
    }
  }

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

  const applicationStatuses = [
    { value: 'Interested', label: 'Interested', icon: Heart, color: '#6b7280' },
    { value: 'Applied', label: 'Applied', icon: Send, color: '#3b82f6' },
    { value: 'Interviewing', label: 'Interviewing', icon: MessageCircle, color: '#f59e0b' },
    { value: 'Offer Received', label: 'Offer Received', icon: CheckCircle2, color: '#10b981' },
    { value: 'Rejected', label: 'Rejected', icon: XCircle, color: '#ef4444' },
  ];

  const handleStatusChange = (newStatus) => {
    onApplicationStatusUpdate(hte.id, newStatus);
  };

  const handleRemoveApplication = () => {
    onApplicationStatusUpdate(hte.id, null);
  };

  return (
    <div className={cardClasses}>
      {!isAdmin && (
        <ApplicationStatusDropdown 
          currentApplication={currentApplication}
          applicationStatuses={applicationStatuses}
          onStatusChange={handleStatusChange}
          onRemove={handleRemoveApplication}
        />
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
        {hte.natureOfBusiness && (
          <p>
            <Building size={16} /> <span>{hte.natureOfBusiness}</span>
          </p>
        )}
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

function ApplicationStatusDropdown({ currentApplication, applicationStatuses, onStatusChange, onRemove }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentStatus = currentApplication?.status || null;
  const statusInfo = currentStatus ? applicationStatuses.find(s => s.value === currentStatus) : null;
  
  const handleStatusSelect = (status) => {
    onStatusChange(status);
    setIsOpen(false);
  };
  
  const handleRemove = (e) => {
    e.stopPropagation();
    onRemove();
    setIsOpen(false);
  };

  return (
    <div className="application-status-dropdown">
      <button
        className={`status-btn ${currentStatus ? 'has-status' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{ color: statusInfo?.color || '#6b7280' }}
      >
        {statusInfo ? (
          <>
            <statusInfo.icon size={16} />
            <span className="status-label">{statusInfo.label}</span>
          </>
        ) : (
          <>
            <Star size={16} />
            <span className="status-label">Track</span>
          </>
        )}
        <ChevronDown size={14} className={`chevron ${isOpen ? 'open' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div className="status-overlay" onClick={() => setIsOpen(false)} />
          <div className="status-dropdown">
            {applicationStatuses.map((status) => (
              <button
                key={status.value}
                className={`status-item ${currentStatus === status.value ? 'active' : ''}`}
                onClick={() => handleStatusSelect(status.value)}
                style={{ color: status.color }}
              >
                <status.icon size={16} />
                <span>{status.label}</span>
              </button>
            ))}
            {currentStatus && (
              <>
                <div className="status-divider" />
                <button className="status-item remove" onClick={handleRemove}>
                  <XCircle size={16} />
                  <span>Remove from tracker</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ApplicationsPage({ allHtes, profile, onApplicationStatusUpdate }) {
  // Handle both legacy and new format
  const applications = profile?.shortlist || [];
  const applicationStatuses = [
    { value: 'Interested', label: 'Interested', icon: Heart, color: '#6b7280' },
    { value: 'Applied', label: 'Applied', icon: Send, color: '#3b82f6' },
    { value: 'Interviewing', label: 'Interviewing', icon: MessageCircle, color: '#f59e0b' },
    { value: 'Offer Received', label: 'Offer Received', icon: CheckCircle2, color: '#10b981' },
    { value: 'Rejected', label: 'Rejected', icon: XCircle, color: '#ef4444' },
  ];

  // Initialize sections to be collapsed by default
  const [expandedSections, setExpandedSections] = useState(() => {
    const initialState = {};
    applicationStatuses.forEach(status => {
      initialState[status.value] = false;
    });
    return initialState;
  });

  // Normalize applications to new format
  let normalizedApplications = [];
  if (applications.length > 0) {
    if (typeof applications[0] === 'string') {
      // Legacy format - convert
      normalizedApplications = applications.map(id => ({ hteId: id, status: 'Interested' }));
    } else {
      // New format
      normalizedApplications = applications.filter(app => typeof app === 'object');
    }
  }

  // Group applications by status
  const groupedApplications = applicationStatuses.reduce((acc, status) => {
    acc[status.value] = normalizedApplications
      .filter(app => app.status === status.value)
      .map(app => allHtes.find(hte => hte.id === app.hteId))
      .filter(hte => hte); // Remove any undefined HTEs
    return acc;
  }, {});

  const totalApplications = normalizedApplications.length;

  const toggleSection = (statusValue) => {
    setExpandedSections(prev => ({
      ...prev,
      [statusValue]: !prev[statusValue]
    }));
  };

  const toggleAllSections = () => {
    const hasAnyExpanded = Object.values(expandedSections).some(expanded => expanded);
    const newState = {};
    applicationStatuses.forEach(status => {
      if (groupedApplications[status.value]?.length > 0) {
        newState[status.value] = !hasAnyExpanded;
      }
    });
    setExpandedSections(newState);
  };

  const hasAnyExpanded = Object.values(expandedSections).some(expanded => expanded);

  return (
    <div>
      <div className="applications-header">
        <div className="applications-title">
          <h1>My Applications</h1>
          <p className="applications-count">
            {totalApplications} {totalApplications === 1 ? 'company' : 'companies'} tracked
          </p>
        </div>
        {totalApplications > 0 && (
          <button 
            onClick={toggleAllSections} 
            className="btn btn-secondary toggle-all-btn"
          >
            {hasAnyExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        )}
      </div>
      
      {totalApplications > 0 ? (
        <div className="applications-by-status">
          {applicationStatuses.map((status) => {
            const StatusIcon = status.icon;
            const companies = groupedApplications[status.value];
            const isExpanded = expandedSections[status.value];
            
            if (companies.length === 0) return null;
            
            return (
              <div key={status.value} className="status-section">
                <button 
                  className="status-header clickable" 
                  style={{ color: status.color }}
                  onClick={() => toggleSection(status.value)}
                >
                  <div className="status-title">
                    <StatusIcon size={20} />
                    <h2>{status.label} ({companies.length})</h2>
                  </div>
                  <ChevronDown 
                    size={20} 
                    className={`section-chevron ${isExpanded ? 'expanded' : ''}`}
                  />
                </button>
                {isExpanded && (
                  <div className="hte-grid status-content">
                    {companies.map((hte) => (
                      <HteCard
                        key={hte.id}
                        hte={hte}
                        isAdmin={false}
                        profile={profile}
                        onApplicationStatusUpdate={onApplicationStatusUpdate}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-applications">
          <Star size={48} className="no-applications-icon" />
          <h2>No applications tracked yet</h2>
          <p>
            Start tracking your internship applications by clicking the "Track" button on companies that interest you in the Dashboard.
          </p>
        </div>
      )}
    </div>
  );
}

function AdminAnalytics({ analytics, allHtes, openModal }) {
  const { 
    totalStudents, 
    expiringHTEs, 
    mostPopularHTEs, 
    activeHTEs, 
    expiredHTEs, 
    applicationStats 
  } = analytics;

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getUrgencyLabel = (urgency) => {
    switch (urgency) {
      case 'high': return 'Critical (≤30 days)';
      case 'medium': return 'Warning (31-60 days)';
      case 'low': return 'Notice (61-90 days)';
      default: return 'Unknown';
    }
  };

  return (
    <div className="admin-analytics">
      <div className="analytics-header">
        <h1>Admin Analytics Dashboard</h1>
        <p className="analytics-subtitle">Overview of OJT portal metrics and insights</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <Users size={24} className="metric-icon students" />
            <h3>Registered Students</h3>
          </div>
          <div className="metric-value">{totalStudents}</div>
          <div className="metric-label">Total students using the portal</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <Building size={24} className="metric-icon active" />
            <h3>Active HTEs</h3>
          </div>
          <div className="metric-value">{activeHTEs}</div>
          <div className="metric-label">Companies with valid MOAs</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <AlertCircle size={24} className="metric-icon expired" />
            <h3>Expired HTEs</h3>
          </div>
          <div className="metric-value">{expiredHTEs}</div>
          <div className="metric-label">Companies needing MOA renewal</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <Clock size={24} className="metric-icon warning" />
            <h3>Expiring Soon</h3>
          </div>
          <div className="metric-value">{expiringHTEs.length}</div>
          <div className="metric-label">MOAs expiring within 90 days</div>
        </div>
      </div>

      {/* Application Status Statistics */}
      <div className="analytics-section">
        <h2>Application Statistics</h2>
        <div className="application-stats-grid">
          {Object.entries(applicationStats).map(([status, count]) => {
            const statusConfig = {
              'Interested': { icon: Heart, color: '#6b7280' },
              'Applied': { icon: Send, color: '#3b82f6' },
              'Interviewing': { icon: MessageCircle, color: '#f59e0b' },
              'Offer Received': { icon: CheckCircle2, color: '#10b981' },
              'Rejected': { icon: XCircle, color: '#ef4444' },
            };
            const config = statusConfig[status] || { icon: Activity, color: '#6b7280' };
            const StatusIcon = config.icon;

            return (
              <div key={status} className="stat-card">
                <div className="stat-header">
                  <StatusIcon size={20} style={{ color: config.color }} />
                  <span className="stat-label">{status}</span>
                </div>
                <div className="stat-value" style={{ color: config.color }}>{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Most Popular HTEs */}
      <div className="analytics-section">
        <h2>Most Popular Companies</h2>
        <div className="popular-htes">
          {mostPopularHTEs.length > 0 ? (
            <div className="popular-list">
              {mostPopularHTEs.map((item, index) => (
                <div key={item.hte.id} className="popular-item">
                  <div className="popular-rank">#{index + 1}</div>
                  <div className="popular-info">
                    <h4>{item.hte.name}</h4>
                    <p>{item.hte.address}</p>
                    <span className="popular-course">{item.hte.course || 'Any Course'}</span>
                  </div>
                  <div className="popular-stats">
                    <div className="popular-count">
                      <Eye size={16} />
                      <span>{item.applications} applications</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              <TrendingUp size={48} className="no-data-icon" />
              <p>No application data available yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Expiring HTEs */}
      <div className="analytics-section">
        <h2>HTEs with Expiring MOAs</h2>
        <div className="expiring-htes">
          {expiringHTEs.length > 0 ? (
            <div className="expiring-list">
              {expiringHTEs.map((hte) => (
                <div key={hte.id} className="expiring-item">
                  <div className="expiring-urgency">
                    <div 
                      className="urgency-dot" 
                      style={{ backgroundColor: getUrgencyColor(hte.urgency) }}
                    ></div>
                    <span className="urgency-label">{getUrgencyLabel(hte.urgency)}</span>
                  </div>
                  <div className="expiring-info">
                    <h4>{hte.name}</h4>
                    <p>{hte.address}</p>
                    <div className="expiring-details">
                      <span className="expiring-course">{hte.course || 'Any Course'}</span>
                      <span className="expiring-contact">{hte.contactPerson}</span>
                    </div>
                  </div>
                  <div className="expiring-timeline">
                    <div className="days-remaining">
                      <Calendar size={16} />
                      <span>{hte.daysUntilExpiry} days</span>
                    </div>
                    <div className="expiry-date">
                      {hte.moaEndDate.toDate().toLocaleDateString()}
                    </div>
                    <button 
                      onClick={() => openModal(hte)}
                      className="btn btn-primary btn-sm"
                    >
                      <Edit size={14} />
                      Update
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              <CheckCircle size={48} className="no-data-icon success" />
              <p>All HTEs have valid MOAs for the next 90 days</p>
            </div>
          )}
        </div>
      </div>
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
              <label htmlFor="natureOfBusiness">Nature of Business</label>
              <input
                type="text"
                name="natureOfBusiness"
                id="natureOfBusiness"
                value={formData.natureOfBusiness}
                onChange={handleFormChange}
                placeholder="e.g., IT Services, Manufacturing, Healthcare"
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

