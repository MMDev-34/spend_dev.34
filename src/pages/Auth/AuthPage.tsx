import React, { useState, useEffect } from "react";
import { useRouter } from "@/app/router";
import { useAuth } from "@/context/AuthContext";
import { UnauthorizedDomainBanner } from "@/components/auth/UnauthorizedDomainBanner";
import { EmailPasswordDisabledBanner } from "@/components/auth/EmailPasswordDisabledBanner";
import { InvalidApiKeyBanner } from "@/components/auth/InvalidApiKeyBanner";
import { resolvedFirebaseConfig } from "@/lib/firebase";
import firebaseConfig from "../../../firebase-applet-config.json";

export const AuthPage: React.FC = () => {
  const { navigate } = useRouter();
  const {
    user,
    isEmailVerified,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    sendPasswordReset,
    resendVerification,
    refreshVerificationStatus,
    signOut,
  } = useAuth();

  const [tab, setTab] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [signupMsg, setSignupMsg] = useState<{ text: string; kind: "err" | "ok" | "" }>({ text: "", kind: "" });
  const [loginMsg, setLoginMsg] = useState<{ text: string; kind: "err" | "ok" | "" }>({ text: "", kind: "" });
  const [signupBadFields, setSignupBadFields] = useState<Record<string, boolean>>({});
  const [loginBadFields, setLoginBadFields] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(false);
  const [showUnauthorizedDomain, setShowUnauthorizedDomain] = useState(false);
  const [showEmailPasswordDisabled, setShowEmailPasswordDisabled] = useState(false);
  const isPlaceholderApiKey = (resolvedFirebaseConfig as any)?.apiKey?.includes("Dummy") || !(resolvedFirebaseConfig as any)?.apiKey;
  const [showInvalidApiKey, setShowInvalidApiKey] = useState(isPlaceholderApiKey);

  // Inline email verification state
  const [verificationPending, setVerificationPending] = useState<{ email: string; name: string } | null>(null);
  const [verifyingCheck, setVerifyingCheck] = useState(false);
  const [verifyStatusMsg, setVerifyStatusMsg] = useState<{ text: string; kind: "err" | "ok" | "" } | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Auto-display verification card if user is currently signed in but unverified
  useEffect(() => {
    if (user && !isEmailVerified) {
      setVerificationPending({
        email: user.email || email || "",
        name: user.displayName || name || "",
      });
    } else if (user && isEmailVerified) {
      navigate("/");
    }
  }, [user, isEmailVerified, email, name, navigate]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Smooth balance count-up effect
  useEffect(() => {
    const fmt = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const balEl = document.getElementById("bal");
    if (!balEl) return;
    const to = 48260;
    let animId: number;
    const start = performance.now() + 300;
    const step = (now: number) => {
      const t = Math.min(Math.max((now - start) / 1600, 0), 1);
      balEl.textContent = fmt.format(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) animId = requestAnimationFrame(step);
    };
    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Performance-optimized, non-layout-shifting interactive tilt for Spend Card
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const ledger = document.getElementById("ledger");
    const note = document.getElementById("note");
    if (!ledger || !note) return;

    let isTicking = false;
    let latestClientX = 0;
    let latestClientY = 0;
    let ledgerRect: DOMRect | null = null;
    let isHovered = false;

    const updateTilt = () => {
      if (isHovered && note && ledgerRect) {
        const rx = -((latestClientY - ledgerRect.top) / ledgerRect.height - 0.5) * 10;
        const ry = ((latestClientX - ledgerRect.left) / ledgerRect.width - 0.5) * 12;
        note.style.setProperty("--rx", `${rx.toFixed(1)}deg`);
        note.style.setProperty("--ry", `${ry.toFixed(1)}deg`);
      }
      isTicking = false;
    };

    const handlePointerMove = (e: PointerEvent) => {
      latestClientX = e.clientX;
      latestClientY = e.clientY;
      if (!isTicking) {
        isTicking = true;
        requestAnimationFrame(updateTilt);
      }
    };

    const handleEnter = () => {
      ledgerRect = ledger.getBoundingClientRect();
      isHovered = true;
    };

    const handleLeave = () => {
      isHovered = false;
      if (note) {
        note.style.setProperty("--rx", "0deg");
        note.style.setProperty("--ry", "0deg");
      }
    };

    ledger.addEventListener("pointerenter", handleEnter, { passive: true });
    ledger.addEventListener("pointermove", handlePointerMove, { passive: true });
    ledger.addEventListener("pointerleave", handleLeave, { passive: true });

    return () => {
      ledger.removeEventListener("pointerenter", handleEnter);
      ledger.removeEventListener("pointermove", handlePointerMove);
      ledger.removeEventListener("pointerleave", handleLeave);
    };
  }, []);

  // Celebration rain effect
  const triggerRain = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const container = document.body;
    for (let i = 0; i < 18; i++) {
      const c = document.createElement("span");
      const isSym = i % 3 === 0;
      c.className = "rain " + (isSym ? "sym" : "coin-s");
      if (isSym) c.textContent = "₹";
      c.style.left = `${Math.random() * 96 + 2}vw`;
      c.style.setProperty("--d", `${(1.3 + Math.random() * 0.7).toFixed(2)}s`);
      c.style.setProperty("--delay", `${(Math.random() * 0.3).toFixed(2)}s`);
      c.style.setProperty("--drift", `${(Math.random() * 100 - 50).toFixed(0)}px`);
      c.addEventListener("animationend", () => c.remove(), { once: true });
      container.appendChild(c);
    }
  };

  const getFriendlyErrorMessage = (err: any): string => {
    const code = err?.code || "";
    switch (code) {
      case "auth/unauthorized-domain":
        return `Domain authorization required: add ${typeof window !== "undefined" ? window.location.hostname : "this domain"} in Firebase Console.`;
      case "auth/email-already-in-use":
        return "An account with this email already exists. Switch to Log in above.";
      case "auth/invalid-email":
        return "That email doesn't look right. Check for a typo.";
      case "auth/weak-password":
        return "Passwords need at least 8 characters.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Invalid email or password. Please check your credentials.";
      case "auth/operation-not-allowed":
        return "Email/Password sign-in is not enabled in your Firebase Console.";
      case "auth/api-key-not-valid":
        return "Firebase Web API Key is invalid. Please configure your project Web API Key.";
      case "auth/too-many-requests":
        return "Access temporarily disabled due to failed attempts. Try resetting password.";
      case "auth/popup-closed-by-user":
        return "Google sign-in was closed before completing.";
      default:
        return err?.message || "An authentication error occurred. Please try again.";
    }
  };

  // Google sign in with mobile event prevention
  const handleGoogle = async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSignupMsg({ text: "", kind: "" });
    setLoginMsg({ text: "", kind: "" });
    setShowUnauthorizedDomain(false);
    setShowEmailPasswordDisabled(false);
    setLoading(true);
    triggerRain();
    try {
      await signInWithGoogle();
      navigate("/");
    } catch (err: any) {
      if (err?.code === "auth/unauthorized-domain") {
        setShowUnauthorizedDomain(true);
        // Scroll smoothly to top on mobile so the user sees the explanation banner
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (err?.code === "auth/operation-not-allowed") {
        setShowEmailPasswordDisabled(true);
      } else if (err?.code === "auth/api-key-not-valid" || String(err).includes("api-key-not-valid")) {
        setShowInvalidApiKey(true);
      } else if (err?.code !== "auth/popup-closed-by-user") {
        const msg = getFriendlyErrorMessage(err);
        if (tab === "signup") setSignupMsg({ text: msg, kind: "err" });
        else setLoginMsg({ text: msg, kind: "err" });
      }
    } finally {
      setLoading(false);
    }
  };

  // Sign up submit: shows inline email verification
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupBadFields({});
    setSignupMsg({ text: "", kind: "" });
    setShowEmailPasswordDisabled(false);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setSignupBadFields((prev) => ({ ...prev, name: true }));
      setSignupMsg({ text: "Add your name so we know what to call you.", kind: "err" });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setSignupBadFields((prev) => ({ ...prev, email: true }));
      setSignupMsg({ text: "That email doesn't look right. Check for a typo.", kind: "err" });
      return;
    }
    if (password.length < 8) {
      setSignupBadFields((prev) => ({ ...prev, pw: true }));
      setSignupMsg({ text: "Passwords need at least 8 characters.", kind: "err" });
      return;
    }

    setLoading(true);
    triggerRain();

    try {
      await signUpWithEmail(trimmedEmail, password, trimmedName);
      // Stay on the signup page and show inline verification view!
      setVerificationPending({ email: trimmedEmail, name: trimmedName });
      setResendCooldown(30);
    } catch (err: any) {
      if (err?.code === "auth/operation-not-allowed") {
        setShowEmailPasswordDisabled(true);
      } else if (err?.code === "auth/api-key-not-valid" || String(err).includes("api-key-not-valid")) {
        setShowInvalidApiKey(true);
      } else {
        setSignupMsg({ text: getFriendlyErrorMessage(err), kind: "err" });
      }
    } finally {
      setLoading(false);
    }
  };

  // Determine direct webmail or default mail client URL
  const getEmailClientUrl = (emailStr: string) => {
    const domain = emailStr.split("@")[1]?.toLowerCase() || "";
    if (domain.includes("gmail") || domain.includes("googlemail")) {
      return "https://mail.google.com";
    } else if (domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live")) {
      return "https://outlook.live.com";
    } else if (domain.includes("yahoo")) {
      return "https://mail.yahoo.com";
    }
    return `mailto:${emailStr}`;
  };

  // Open email in webmail or mail client
  const handleOpenEmail = () => {
    if (!verificationPending) return;
    const url = getEmailClientUrl(verificationPending.email);
    window.open(url, "_blank");
  };

  // Check if email has been verified
  const handleCheckVerified = async () => {
    setVerifyingCheck(true);
    setVerifyStatusMsg(null);
    try {
      const verified = await refreshVerificationStatus();
      if (verified) {
        setVerifyStatusMsg({ text: "Email verified successfully! Opening your ledger…", kind: "ok" });
        setTimeout(() => navigate("/"), 800);
      } else {
        setVerifyStatusMsg({
          text: "Email not verified yet. Please click the link sent to your inbox, then click here again.",
          kind: "err",
        });
      }
    } catch {
      setVerifyStatusMsg({ text: "Unable to check status right now. Please try again.", kind: "err" });
    } finally {
      setVerifyingCheck(false);
    }
  };

  // Resend verification link
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setVerifyStatusMsg(null);
    try {
      await resendVerification();
      setResendCooldown(30);
      setVerifyStatusMsg({ text: "Verification link resent. Check your inbox or spam folder.", kind: "ok" });
    } catch (err: any) {
      setVerifyStatusMsg({ text: "Failed to resend email. Please wait a moment.", kind: "err" });
    }
  };

  // Login submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginBadFields({});
    setLoginMsg({ text: "", kind: "" });
    setShowEmailPasswordDisabled(false);

    const trimmedEmail = loginEmail.trim();

    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setLoginBadFields((prev) => ({ ...prev, email: true }));
      setLoginMsg({ text: "Enter the email you signed up with.", kind: "err" });
      return;
    }
    if (!loginPassword) {
      setLoginBadFields((prev) => ({ ...prev, pw: true }));
      setLoginMsg({ text: "Enter your password.", kind: "err" });
      return;
    }

    setLoading(true);
    setLoginMsg({ text: "Checking your details…", kind: "" });
    triggerRain();

    try {
      await signInWithEmail(trimmedEmail, loginPassword);
      setLoginMsg({ text: "You're in. Here's your month.", kind: "ok" });
      setTimeout(() => navigate("/"), 600);
    } catch (err: any) {
      if (err?.code === "auth/operation-not-allowed") {
        setShowEmailPasswordDisabled(true);
      } else if (err?.code === "auth/api-key-not-valid" || String(err).includes("api-key-not-valid")) {
        setShowInvalidApiKey(true);
      } else {
        setLoginMsg({ text: getFriendlyErrorMessage(err), kind: "err" });
      }
    } finally {
      setLoading(false);
    }
  };

  // Forgot password
  const handleForgot = async () => {
    const trimmedEmail = loginEmail.trim();
    if (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setLoginBadFields((prev) => ({ ...prev, email: true }));
      setLoginMsg({ text: "Enter your email address above first.", kind: "err" });
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(trimmedEmail);
      setLoginMsg({ text: `Password reset link sent to ${trimmedEmail}.`, kind: "ok" });
    } catch (err: any) {
      setLoginMsg({ text: getFriendlyErrorMessage(err), kind: "err" });
    } finally {
      setLoading(false);
    }
  };

  // Password strength computation
  const pwScore = [
    password.length >= 8,
    /[A-Z]/.test(password) && /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  const pwLabels = ["Too short", "Weak", "Fair", "Good", "Strong"];

  return (
    <>
      <style>{`
        :root{
          --bg:#0A0B07; --panel:#0E100A; --card:#12150E; --edge:#050603;
          --lime:#DDFB5C; --lime-d:#8fb22a; --lime-glow:rgba(221,251,92,.35);
          --txt:#F1F4E4; --mut:#858A72; --red:#FF7A5C;
          --display:"Fraunces", Georgia, serif; --text:"Space Grotesk", system-ui, sans-serif;
        }
        *{box-sizing:border-box}
        
        /* Compact, Viewport-Fitted Shell with Zero Scrolling on desktop */
        .spend-auth-root{
          margin:0;
          height:100vh;
          max-height:100vh;
          overflow:hidden;
          background:var(--bg);
          color:var(--txt);
          font-family:var(--text);
          font-size:15px;
          line-height:1.45;
        }
        .spend-auth-root button,.spend-auth-root input{font:inherit}

        .shell{
          display:grid;
          grid-template-columns:1.05fr 0.95fr;
          height:100vh;
          max-height:100vh;
        }

        /* ---------- Left: statement ---------- */
        .ledger{
          position:relative;
          padding:28px clamp(24px, 4vw, 54px);
          display:flex;
          flex-direction:column;
          justify-content:space-between;
          overflow:hidden;
          isolation:isolate;
          background:radial-gradient(circle at 14% 0%, rgba(221,251,92,.08), transparent 55%),
                     radial-gradient(circle at 85% 90%, rgba(143,178,42,.07), transparent 60%),
                     var(--panel);
          border-right:1px solid #1c2015;
        }

        .brand{
          display:flex;
          align-items:center;
          gap:9px;
          font-family:var(--display);
          font-size:22px;
          font-weight:700;
        }
        .mark{
          width:28px;
          height:28px;
          border-radius:50%;
          background:radial-gradient(circle at 32% 28%,#fff,var(--lime) 30%,#56701a);
          display:grid;
          place-items:center;
          color:var(--bg);
          font-size:15px;
          font-weight:700;
        }

        .lede{
          margin:14px 0 0;
          font-family:var(--display);
          font-weight:500;
          font-size:clamp(26px, 3vw, 38px);
          line-height:1.08;
          letter-spacing:-.02em;
          max-width:16ch;
        }
        .lede em{font-style:italic;color:var(--lime)}

        /* Spend Card & Hero Coin Row */
        .card-coin-stage{
          position:relative;
          display:flex;
          align-items:center;
          gap:20px;
          margin:16px 0 0;
          max-width:440px;
        }

        /* Stable, Compact Spend Card */
        .note{
          --rx:0deg;
          --ry:0deg;
          position:relative;
          width:min(290px, 100%);
          flex:1;
          margin:0;
          padding:16px 18px;
          border-radius:14px;
          overflow:hidden;
          background:linear-gradient(145deg,#24300a,#101405 75%);
          border:1px solid rgba(221,251,92,.22);
          transform:perspective(800px) rotateX(var(--rx)) rotateY(var(--ry));
          transition:transform .2s ease-out;
          box-shadow:0 20px 40px -15px #000,inset 0 1px 0 rgba(221,251,92,.2);
        }
        .note .top{display:flex;justify-content:space-between;font-size:12px;color:var(--mut)}
        .note .amt{font-family:var(--display);font-size:34px;font-weight:700;margin:8px 0 2px;color:var(--lime);font-variant-numeric:tabular-nums;line-height:1}
        .note .to{font-size:12px;color:var(--mut)}

        /* ---------- Slow-spinning 3D Hero Coin Beside Spend Card ---------- */
        .hero-coin-wrapper{
          position:relative;
          width:86px;
          height:86px;
          perspective:1000px;
          display:flex;
          align-items:center;
          justify-content:center;
          flex-shrink:0;
          user-select:none;
        }

        .hero-coin-float{
          position:relative;
          width:78px;
          height:78px;
          transform-style:preserve-3d;
          animation:heroCoinFloat 4.2s ease-in-out infinite;
        }

        @keyframes heroCoinFloat{
          0%, 100%{
            transform:translateY(0px) rotateZ(-3deg);
          }
          50%{
            transform:translateY(-8px) rotateZ(3deg);
          }
        }

        /* Subtle radial ambient glow pulsing on rotation */
        .hero-coin-glow{
          position:absolute;
          inset:-16px;
          border-radius:50%;
          background:radial-gradient(circle, rgba(221,251,92,0.38) 0%, rgba(221,251,92,0.12) 42%, transparent 70%);
          filter:blur(10px);
          pointer-events:none;
          animation:heroCoinGlowPulse 3.8s ease-in-out infinite alternate;
        }

        @keyframes heroCoinGlowPulse{
          0%{ opacity:0.5; transform:scale(0.92); }
          100%{ opacity:0.95; transform:scale(1.12); }
        }

        /* Continuous 3D metallic slow rotation */
        .hero-coin{
          position:relative;
          width:100%;
          height:100%;
          transform-style:preserve-3d;
          animation:heroCoinSpin 13s linear infinite;
        }

        @keyframes heroCoinSpin{
          0%{
            transform:rotateX(14deg) rotateY(0deg);
          }
          100%{
            transform:rotateX(14deg) rotateY(360deg);
          }
        }

        /* 3D Coin Layers (giving actual cylindrical metallic thickness) */
        .coin-face{
          position:absolute;
          inset:0;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          backface-visibility:hidden;
          background:radial-gradient(circle at 34% 28%, #FFFFFF 0%, #FAFFB5 16%, #DDFB5C 36%, #A5CE1F 58%, #57730E 82%, #263404 100%);
          border:2.5px solid #FFFFAA;
          box-shadow:inset 0 2px 4px rgba(255,255,255,0.7),
                     inset 0 -3px 6px rgba(0,0,0,0.7),
                     0 6px 16px -2px rgba(0,0,0,0.8),
                     0 0 14px rgba(221,251,92,0.25);
          overflow:hidden;
        }

        .coin-front{
          transform:translateZ(3.5px);
        }

        .coin-back{
          transform:rotateY(180deg) translateZ(3.5px);
          background:radial-gradient(circle at 34% 28%, #FFFFFF 0%, #FAFFB5 16%, #C8EC35 36%, #8FB516 58%, #4B630B 82%, #222E03 100%);
        }

        /* Coin metallic thickness slabs */
        .coin-slab{
          position:absolute;
          inset:0;
          border-radius:50%;
          background:radial-gradient(circle, #5E7A12 0%, #3B4E08 70%, #1A2402 100%);
          border:1px solid #789B19;
          box-shadow:inset 0 0 4px rgba(0,0,0,0.8);
        }
        .coin-slab-1{ transform:translateZ(2px); }
        .coin-slab-2{ transform:translateZ(0px); }
        .coin-slab-3{ transform:translateZ(-2px); }

        /* Outer beaded coin rim */
        .coin-rim-beads{
          position:absolute;
          inset:3px;
          border-radius:50%;
          border:1.5px dashed rgba(255,255,255,0.45);
          pointer-events:none;
        }

        /* Inner engraved concentric ring */
        .coin-inner-ring{
          position:absolute;
          inset:8px;
          border-radius:50%;
          border:1px solid rgba(40,54,7,0.45);
          box-shadow:inset 0 1px 1px rgba(255,255,255,0.4), 0 1px 1px rgba(0,0,0,0.3);
          pointer-events:none;
        }

        /* Embossed metallic Rupee & Spend marks */
        .coin-symbol{
          font-family:var(--display);
          font-size:32px;
          font-weight:700;
          color:#1C2605;
          line-height:1;
          margin-top:-2px;
          text-shadow:0 1px 1px rgba(255,255,255,0.85),
                      0 -1px 1px rgba(0,0,0,0.65),
                      0 2px 4px rgba(0,0,0,0.4);
          z-index:2;
        }

        .coin-symbol.back{
          font-size:16px;
          font-family:var(--text);
          letter-spacing:.08em;
          text-transform:uppercase;
          font-weight:700;
        }

        /* Dynamic light reflection sweep */
        .coin-sheen{
          position:absolute;
          inset:-30px;
          background:linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.6) 47%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0.5) 53%, transparent 68%);
          transform:translateX(-100%) rotate(25deg);
          animation:heroCoinSheen 3.6s ease-in-out infinite;
          pointer-events:none;
          z-index:3;
        }

        @keyframes heroCoinSheen{
          0%{ transform:translateX(-130%) rotate(25deg); }
          45%, 100%{ transform:translateX(130%) rotate(25deg); }
        }

        .statement{
          margin:16px 0 0;
          max-width:400px;
        }
        .bal-label{font-size:12px;color:var(--mut);margin:0 0 2px}
        .balance{font-family:var(--display);font-size:clamp(36px,4.5vw,52px);font-weight:700;line-height:1;font-variant-numeric:tabular-nums;letter-spacing:-.03em}
        .balance small{font-size:.5em;vertical-align:.45em;margin-right:3px;color:var(--lime)}
        
        .spark{display:block;width:100%;height:44px;margin:8px 0 0;overflow:visible}
        .spark path{fill:none;stroke:var(--lime);stroke-width:2.2;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;animation:draw 1.8s .2s cubic-bezier(.4,0,.2,1) forwards;filter:drop-shadow(0 0 5px rgba(221,251,92,.45))}
        @keyframes draw{to{stroke-dashoffset:0}}
        .spark .dot{fill:var(--lime);opacity:0;animation:pop .4s 2s ease-out forwards}
        .spark .ring{fill:none;stroke:var(--lime);stroke-width:1.8;opacity:0;transform-box:fill-box;transform-origin:center;animation:ping 1.8s 2.3s ease-out infinite}
        @keyframes pop{to{opacity:1}}
        @keyframes ping{0%{opacity:.8;transform:scale(1)}100%{opacity:0;transform:scale(3)}}

        .rows{list-style:none;margin:12px 0 0;padding:0;border-top:1px solid #1f2416}
        .row{display:flex;align-items:baseline;gap:8px;padding:8px 0;border-bottom:1px solid #1f2416;font-size:13px}
        .row .dots{flex:1;border-bottom:1px dotted #323a26;transform:translateY(-3px)}
        .row .amt{font-variant-numeric:tabular-nums;font-weight:600}
        .in{color:var(--lime)}.out{color:var(--red)}

        .ticker{padding-top:12px;overflow:hidden;white-space:nowrap;color:#555d47;font-size:12.5px;mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
        .track{display:inline-block;animation:marq 26s linear infinite}
        @keyframes marq{to{transform:translate3d(-50%,0,0)}}

        /* ---------- Right: Compact Auth Panel ---------- */
        .auth{
          position:relative;
          padding:24px clamp(20px, 4vw, 48px);
          display:flex;
          flex-direction:column;
          justify-content:center;
          max-width:440px;
          width:100%;
          justify-self:center;
          overflow:hidden;
        }

        /* Compact Tabs */
        .tabs{
          position:relative;
          display:grid;
          grid-template-columns:1fr 1fr;
          background:var(--card);
          border-radius:12px;
          padding:4px;
          margin-bottom:18px;
          border:1px solid #232918;
          box-shadow:inset 0 2px 4px #000;
        }
        .tabs::before{
          content:"";
          position:absolute;
          top:4px;
          bottom:4px;
          left:4px;
          width:calc(50% - 4px);
          background:var(--lime);
          border-radius:9px;
          box-shadow:0 3px 0 var(--lime-d),0 6px 14px -4px var(--lime-glow);
          transition:transform .25s cubic-bezier(.2,.8,.2,1);
        }
        .tabs[data-mode="login"]::before{transform:translateX(100%)}
        .tabs button{
          position:relative;
          z-index:1;
          border:0;
          background:none;
          padding:8px 0;
          cursor:pointer;
          font-weight:600;
          font-size:14px;
          color:var(--mut);
          transition:color .2s;
          border-radius:9px;
        }
        .tabs button[aria-selected="true"]{color:var(--bg)}

        .auth h1{
          font-family:var(--display);
          font-weight:500;
          font-size:clamp(26px, 3.2vw, 34px);
          letter-spacing:-.02em;
          line-height:1.06;
          margin:0 0 4px;
        }
        .auth .sub{
          margin:0 0 16px;
          color:var(--mut);
          font-size:13.5px;
        }

        .panel{display:none}
        .panel.active{display:grid;gap:0;animation:fadeIn .2s ease-out both}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}

        /* ---------- 100% Autofill-Proof Two-Row Structured Input Box ---------- */
        .field{
          position:relative;
          margin-top:10px;
        }
        .block{
          position:relative;
          height:56px;
          background:#12150E;
          border-radius:12px;
          border:1px solid #222816;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
          padding:6px 14px 7px;
          display:flex;
          flex-direction:column;
          justify-content:space-between;
          transition:border-color .18s ease,box-shadow .18s ease,background .18s ease;
        }
        .block:hover{
          border-color:#323b20;
          background:#14180F;
        }
        
        /* Crisp halo focus */
        .field:focus-within .block{
          border-color:var(--lime);
          background:#15190F;
          box-shadow:0 0 0 1px var(--lime),0 0 16px -2px rgba(221,251,92,.22),inset 0 1px 0 rgba(255,255,255,.07);
        }

        /* Dedicated Header Label Row: PHYSICALLY SEPARATE FROM INPUT */
        .field-label{
          display:block;
          font-size:11px;
          font-weight:600;
          letter-spacing:.035em;
          text-transform:uppercase;
          color:#757C65;
          line-height:13px;
          pointer-events:none;
          transition:color .18s ease;
        }
        .field:focus-within .field-label{
          color:var(--lime);
        }
        
        .field.bad .block{
          border-color:var(--red);
          box-shadow:0 0 0 1px var(--red),0 0 12px -2px rgba(255,122,92,.25);
        }
        .field.bad .field-label{
          color:var(--red);
        }
        .field.shake{animation:fastShake .3s cubic-bezier(.36,.07,.19,.97) both}
        @keyframes fastShake{20%,80%{transform:translateX(-3px)}40%,60%{transform:translateX(3px)}}

        /* Dedicated Input Row below the label */
        .input-row{
          display:flex;
          align-items:center;
          width:100%;
          height:24px;
        }

        .input-row input{
          width:100%;
          height:24px;
          line-height:24px;
          padding:0;
          border:0;
          background:transparent;
          outline:none;
          font-family:var(--text);
          font-size:14.5px;
          font-weight:500;
          color:var(--txt);
          letter-spacing:-.01em;
          caret-color:var(--lime);
        }

        /* Vanish-on-Focus: idle placeholder styling */
        .input-row input::placeholder{
          color:#656D55;
          font-size:13.5px;
          font-weight:400;
          opacity:1;
          transition:opacity 0.12s ease, color 0.12s ease;
        }
        .input-row input::-webkit-input-placeholder{
          color:#656D55;
          font-size:13.5px;
          font-weight:400;
          opacity:1;
          transition:opacity 0.12s ease, color 0.12s ease;
        }
        .input-row input::-moz-placeholder{
          color:#656D55;
          font-size:13.5px;
          font-weight:400;
          opacity:1;
        }

        /* Completely removes placeholder names on focus */
        .input-row input:focus::placeholder{
          color:transparent !important;
          opacity:0 !important;
          visibility:hidden !important;
        }
        .input-row input:focus::-webkit-input-placeholder{
          color:transparent !important;
          opacity:0 !important;
          visibility:hidden !important;
        }
        .input-row input:focus::-moz-placeholder{
          color:transparent !important;
          opacity:0 !important;
          visibility:hidden !important;
        }
        
        /* Chrome Autofill: seamless text filling with zero baseline clipping */
        .input-row input:-webkit-autofill,
        .input-row input:-webkit-autofill:hover,
        .input-row input:-webkit-autofill:focus,
        .input-row input:-webkit-autofill:active{
          -webkit-text-fill-color:var(--txt)!important;
          -webkit-box-shadow:0 0 0 1000px #12150E inset!important;
          box-shadow:0 0 0 1000px #12150E inset!important;
          font-family:var(--text)!important;
          font-size:14.5px!important;
          line-height:24px!important;
          caret-color:var(--lime)!important;
          transition:background-color 5000s ease-in-out 0s;
        }

        /* Compact Eye Button */
        .eye{
          height:24px;
          padding:0 8px;
          margin-left:8px;
          border:1px solid rgba(221,251,92,.2);
          border-radius:6px;
          background:rgba(221,251,92,.06);
          color:var(--lime);
          font-size:11px;
          font-weight:600;
          cursor:pointer;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          flex-shrink:0;
          transition:background .15s,border-color .15s;
        }
        .eye:hover{background:rgba(221,251,92,.16);border-color:rgba(221,251,92,.4)}

        .row-line{
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-top:10px;
          font-size:13px;
          color:var(--mut);
        }
        .check{display:flex;gap:7px;align-items:center;cursor:pointer}
        .check input{accent-color:var(--lime);width:15px;height:15px}
        .link{color:var(--lime);font-weight:600;background:none;border:0;padding:0;cursor:pointer;border-bottom:1px solid currentColor}

        .meter{display:flex;gap:5px;margin-top:8px;align-items:center;min-height:16px}
        .meter i{width:11px;height:11px;border-radius:50%;background:#1b2014;box-shadow:inset 0 0 0 1px #2d351f;transition:background .2s,transform .2s}
        .meter i.on{background:radial-gradient(circle at 32% 28%,#fff,var(--lime) 35%,#56701a);box-shadow:0 0 6px var(--lime-glow);transform:translateY(-2px)}
        .meter span{margin-left:6px;font-size:11.5px;color:var(--mut)}

        .msg{min-height:18px;margin:8px 0 0;font-size:13px;color:var(--mut);line-height:1.3}
        .msg.err{color:var(--red)}
        .msg.ok{color:var(--lime);font-weight:600}

        /* Compact 3D Press Button */
        .submit{
          position:relative;
          overflow:hidden;
          margin-top:10px;
          height:46px;
          width:100%;
          border:0;
          border-radius:11px;
          background:var(--lime);
          color:var(--bg);
          font-size:15px;
          font-weight:700;
          cursor:pointer;
          box-shadow:0 5px 0 var(--lime-d),0 10px 18px -8px var(--lime-glow);
          transition:transform .12s,box-shadow .12s;
        }
        .submit:hover{transform:translateY(-1px);box-shadow:0 6px 0 var(--lime-d),0 14px 22px -8px var(--lime-glow)}
        .submit:active{transform:translateY(3px);box-shadow:0 2px 0 var(--lime-d)}
        .submit .label,.submit .check-ico{position:absolute;inset:0;display:grid;place-items:center;transition:opacity .2s}
        .submit .check-ico{opacity:0;font-size:18px}
        .submit.busy{background:#f5c86a;box-shadow:0 5px 0 #b07e1c}
        .submit.busy .label{opacity:0}
        .submit.busy .check-ico{opacity:1}
        .submit:disabled{cursor:default}

        .or{display:flex;align-items:center;gap:12px;margin:12px 0 10px;color:var(--mut);font-size:12px}
        .or::before,.or::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,#313824,transparent)}
        
        /* Compact Google Button */
        .google{
          position:relative;
          overflow:hidden;
          width:100%;
          height:44px;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          border:1px solid #232a18;
          border-radius:11px;
          background:var(--card);
          color:var(--txt);
          font-weight:600;
          font-size:14px;
          cursor:pointer;
          box-shadow:0 4px 0 var(--edge),0 8px 14px -6px #000;
          transition:transform .12s,box-shadow .12s,border-color .2s;
        }
        .google:hover{transform:translateY(-1px);border-color:var(--lime-d)}
        .google:active{transform:translateY(2px);box-shadow:0 2px 0 var(--edge)}
        .g{width:18px;height:18px;flex:none}

        .fine{margin:12px 0 0;font-size:12px;color:var(--mut);text-align:center}

        /* Inline verification card styling */
        .verify-card{
          padding:20px;
          border-radius:14px;
          background:#12150E;
          border:1px solid #252D18;
          box-shadow:0 8px 24px -10px rgba(0,0,0,0.8);
          animation:fadeIn .25s ease-out both;
        }
        .verify-badge{
          width:42px;
          height:42px;
          border-radius:12px;
          background:rgba(221,251,92,0.12);
          border:1px solid rgba(221,251,92,0.25);
          display:grid;
          place-items:center;
          color:var(--lime);
          margin-bottom:12px;
        }

        /* Money rain */
        .rain{position:fixed;top:-30px;pointer-events:none;z-index:9999;animation:fall var(--d) cubic-bezier(.35,.05,.6,1) var(--delay) forwards}
        .rain.coin-s{width:18px;height:18px;border-radius:50%;background:radial-gradient(circle at 32% 28%,#fbffe0,var(--lime) 35%,#56701a);box-shadow:0 0 8px var(--lime-glow)}
        .rain.sym{font-family:var(--display);font-weight:700;font-size:22px;color:var(--lime);text-shadow:0 0 8px var(--lime-glow)}
        @keyframes fall{0%{transform:translate3d(0,0,0)}100%{transform:translate3d(var(--drift),105vh,0) rotate(540deg);opacity:.1}}

        /* Responsive on small devices */
        @media (max-width:860px){
          .spend-auth-root{
            height:auto;
            max-height:none;
            overflow-y:auto;
          }
          .shell{
            grid-template-columns:1fr;
            height:auto;
            max-height:none;
          }
          .ledger{padding:24px 20px 20px}
          .rows,.ticker{display:none}
          .card-coin-stage{gap:14px;max-width:100%}
          .hero-coin-wrapper{width:72px;height:72px}
          .hero-coin-float{width:66px;height:66px}
          .coin-symbol{font-size:26px}
          .auth{padding:24px 20px 40px;max-width:none}
        }
      `}</style>

      <div className="spend-auth-root">
        <main className="shell">
          {/* ---------- Left: statement ---------- */}
          <section className="ledger" id="ledger" aria-label="Preview of your statement">
            <div>
              <div className="brand">
                <img src="/icons/icon-192.png" alt="Spend" className="w-7 h-7 rounded-full object-cover shadow-sm ring-1 ring-emerald-500/30" />
                <span>Spend</span>
              </div>
              <h2 className="lede">Every rupee in, every rupee out, <em>accounted for.</em></h2>

              <div className="card-coin-stage">
                <div className="note" id="note" aria-hidden="true">
                  <div className="top"><span>Spend Card</span><span>Pay to: you</span></div>
                  <div className="amt">₹ 1,00,000</div>
                  <div className="to">Your next goal, funded one coin at a time</div>
                </div>

                {/* Slow-spinning 3D hero coin floating beside the Spend Card */}
                <div className="hero-coin-wrapper" aria-hidden="true" title="Hero Rupee Coin">
                  <div className="hero-coin-float">
                    <div className="hero-coin-glow" />
                    <div className="hero-coin">
                      {/* Metallic 3D edge depth slabs */}
                      <div className="coin-slab coin-slab-1" />
                      <div className="coin-slab coin-slab-2" />
                      <div className="coin-slab coin-slab-3" />

                      {/* Front face with metallic embossed Rupee ₹ */}
                      <div className="coin-face coin-front">
                        <div className="coin-rim-beads" />
                        <div className="coin-inner-ring" />
                        <span className="coin-symbol">₹</span>
                        <div className="coin-sheen" />
                      </div>

                      {/* Back face with metallic embossed goal value */}
                      <div className="coin-face coin-back">
                        <div className="coin-rim-beads" />
                        <div className="coin-inner-ring" />
                        <span className="coin-symbol back">1L</span>
                        <div className="coin-sheen" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="statement">
                <p className="bal-label">Net balance this month</p>
                <div className="balance"><small>₹</small><span id="bal">0.00</span></div>
                <svg className="spark" viewBox="0 0 400 44" preserveAspectRatio="none" aria-hidden="true">
                  <path pathLength="1" d="M0 36 C40 32 60 16 100 22 S170 40 210 24 S290 6 330 12 S380 7 400 3"/>
                  <circle className="ring" cx="400" cy="3" r="5"/>
                  <circle className="dot" cx="400" cy="4" r="4"/>
                </svg>
                <ol className="rows">
                  <li className="row"><span>Salary, credited</span><span className="dots"></span><span className="amt in">+ ₹52,000</span></li>
                  <li className="row"><span>Rent</span><span className="dots"></span><span className="amt out">− ₹14,000</span></li>
                  <li className="row"><span>Swiggy, dinner</span><span className="dots"></span><span className="amt out">− ₹412</span></li>
                </ol>
              </div>
            </div>

            <div className="ticker" aria-hidden="true">
              <div className="track">UPI · Salary · Rent · Groceries · Swiggy · Electricity · SIP · Freelance · UPI · Salary · Rent · Groceries · Swiggy · Electricity · SIP · Freelance · </div>
            </div>
          </section>

          {/* ---------- Right: Compact Auth Panel ---------- */}
          <section className="auth">
            {verificationPending ? (
              /* Inline Email Verification Card */
              <div className="verify-card">
                <div className="verify-badge">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h1 style={{ fontSize: "24px", margin: "0 0 4px" }}>Verify your email</h1>
                <p className="sub" style={{ margin: "0 0 16px", fontSize: "13px" }}>
                  We sent a confirmation link to <span style={{ color: "var(--lime)", fontWeight: 600 }}>{verificationPending.email}</span>. Please verify to activate your account.
                </p>

                {/* Primary: Open Email */}
                <a
                  href={getEmailClientUrl(verificationPending.email)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="submit"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                >
                  <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="label">Open Email</span>
                </a>

                {/* Secondary Actions: Check Verified & Resend */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" }}>
                  <button
                    type="button"
                    className="google"
                    style={{ height: "40px", fontSize: "12.5px" }}
                    onClick={handleCheckVerified}
                    disabled={verifyingCheck}
                  >
                    <span>{verifyingCheck ? "Checking…" : "I've Verified"}</span>
                  </button>

                  <button
                    type="button"
                    className="google"
                    style={{ height: "40px", fontSize: "12.5px" }}
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                  >
                    <span>{resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend Link"}</span>
                  </button>
                </div>

                {verifyStatusMsg && (
                  <p className={`msg ${verifyStatusMsg.kind}`} style={{ marginTop: "10px" }}>
                    {verifyStatusMsg.text}
                  </p>
                )}

                <div style={{ textAlign: "center", marginTop: "16px" }}>
                  <button
                    type="button"
                    className="link"
                    style={{ fontSize: "12.5px" }}
                    onClick={async () => {
                      setVerificationPending(null);
                      await signOut();
                      setTab("login");
                    }}
                  >
                    Back to Log in
                  </button>
                </div>
              </div>
            ) : (
              /* Regular Auth View (Tabs + Forms) */
              <>
                <div className="tabs" role="tablist" aria-label="Sign up or log in" data-mode={tab}>
                  <button
                    type="button"
                    role="tab"
                    id="tab-signup"
                    aria-selected={tab === "signup"}
                    data-mode="signup"
                    onClick={() => {
                      setTab("signup");
                      setSignupMsg({ text: "", kind: "" });
                      setSignupBadFields({});
                    }}
                  >
                    Sign up
                  </button>
                  <button
                    type="button"
                    role="tab"
                    id="tab-login"
                    aria-selected={tab === "login"}
                    data-mode="login"
                    onClick={() => {
                      setTab("login");
                      setLoginMsg({ text: "", kind: "" });
                      setLoginBadFields({});
                    }}
                  >
                    Log in
                  </button>
                </div>

                <h1>{tab === "signup" ? "Create your account" : "Welcome back"}</h1>
                <p className="sub">
                  {tab === "signup"
                    ? "Track income and spending in rupees. Free to start."
                    : "Pick up where your ledger left off."}
                </p>

                {showUnauthorizedDomain && <div className="mb-3"><UnauthorizedDomainBanner /></div>}
                {showEmailPasswordDisabled && <div className="mb-3"><EmailPasswordDisabledBanner onSwitchToGoogle={handleGoogle} /></div>}

                {/* Sign up form */}
                <form
                  className={`panel ${tab === "signup" ? "active" : ""}`}
                  id="form-signup"
                  onSubmit={handleSignupSubmit}
                  noValidate
                >
                  <div className={`field ${signupBadFields.name ? "bad shake" : ""}`} id="s-name">
                    <div className="block">
                      <label className="field-label" htmlFor="s-name-in">Full name</label>
                      <div className="input-row">
                        <input
                          id="s-name-in"
                          name="spend_name"
                          type="text"
                          placeholder="Full name"
                          autoComplete="name"
                          value={name}
                          onFocus={(e) => {
                            e.currentTarget.placeholder = "";
                          }}
                          onBlur={(e) => {
                            if (!e.currentTarget.value) e.currentTarget.placeholder = "Full name";
                          }}
                          onChange={(e) => {
                            setName(e.target.value);
                            if (signupBadFields.name) setSignupBadFields((b) => ({ ...b, name: false }));
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={`field ${signupBadFields.email ? "bad shake" : ""}`} id="s-email">
                    <div className="block">
                      <label className="field-label" htmlFor="s-email-in">Email address</label>
                      <div className="input-row">
                        <input
                          id="s-email-in"
                          name="spend_email"
                          type="email"
                          placeholder="Email address"
                          autoComplete="email"
                          value={email}
                          onFocus={(e) => {
                            e.currentTarget.placeholder = "";
                          }}
                          onBlur={(e) => {
                            if (!e.currentTarget.value) e.currentTarget.placeholder = "Email address";
                          }}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (signupBadFields.email) setSignupBadFields((b) => ({ ...b, email: false }));
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={`field ${signupBadFields.pw ? "bad shake" : ""}`} id="s-pw">
                    <div className="block">
                      <label className="field-label" htmlFor="s-pw-in">Password</label>
                      <div className="input-row">
                        <input
                          id="s-pw-in"
                          name="spend_create_pw"
                          type={showSignupPassword ? "text" : "password"}
                          placeholder="Password"
                          autoComplete="new-password"
                          data-lpignore="true"
                          data-1p-ignore="true"
                          data-form-type="other"
                          readOnly
                          onFocus={(e) => {
                            e.currentTarget.readOnly = false;
                            e.currentTarget.placeholder = "";
                          }}
                          onMouseDown={(e) => {
                            e.currentTarget.readOnly = false;
                          }}
                          onBlur={(e) => {
                            if (!e.currentTarget.value) e.currentTarget.placeholder = "Password";
                          }}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (signupBadFields.pw) setSignupBadFields((b) => ({ ...b, pw: false }));
                          }}
                        />
                        <button
                          type="button"
                          className="eye"
                          onClick={() => setShowSignupPassword((s) => !s)}
                          aria-label="Show password"
                        >
                          {showSignupPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="meter" aria-hidden="true">
                    <i className={pwScore >= 1 ? "on" : ""}></i>
                    <i className={pwScore >= 2 ? "on" : ""}></i>
                    <i className={pwScore >= 3 ? "on" : ""}></i>
                    <i className={pwScore >= 4 ? "on" : ""}></i>
                    <span>{password ? pwLabels[pwScore] : ""}</span>
                  </div>
                  <p className={`msg ${signupMsg.kind ? signupMsg.kind : ""}`} role="status">
                    {signupMsg.text}
                  </p>
                  <button className={`submit ${loading ? "busy" : ""}`} type="submit" disabled={loading}>
                    <span className="label">Open my wallet</span>
                    <span className="check-ico">✓</span>
                  </button>
                  <div className="or">or</div>
                  <button className="google" type="button" onClick={(e) => handleGoogle(e)} disabled={loading}>
                    <svg className="g" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13.5 17.7 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z"/>
                      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.8-6C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.7l7.8-6z"/>
                      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.7-4-13.6-9.8l-7.8 6C6.5 42.6 14.6 48 24 48z"/>
                    </svg>
                    <span>Sign up with Google</span>
                  </button>

                  {showUnauthorizedDomain && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left text-xs text-amber-200 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300">
                        <span>⚠️ Domain Authorization Required</span>
                      </div>
                      <p className="text-[11px] text-[#D4D4D8] leading-relaxed">
                        Google blocked login from this domain. To enable Google Sign-In, add <code className="text-emerald-400 font-mono font-semibold">{typeof window !== "undefined" ? window.location.hostname : ""}</code> to <strong>Authorized domains</strong> in Firebase Console.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            if (typeof window !== "undefined") {
                              navigator.clipboard?.writeText(window.location.hostname);
                              setSignupMsg({ text: `Copied ${window.location.hostname} to clipboard!`, kind: "ok" });
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 font-bold text-[11px] transition cursor-pointer"
                        >
                          Copy Domain
                        </button>
                        <a
                          href={`https://console.firebase.google.com/project/${(firebaseConfig as any)?.projectId || "spend-d4b10"}/authentication/settings`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-emerald-400 underline hover:text-emerald-300 font-medium"
                        >
                          Open Firebase Settings →
                        </a>
                      </div>
                      <div className="text-[10px] text-[#A1A1AA] pt-1 border-t border-amber-500/20">
                        💡 Tip: Email & Password sign-up works immediately without domain authorization!
                      </div>
                    </div>
                  )}
                </form>

                {/* Log in form */}
                <form
                  className={`panel ${tab === "login" ? "active" : ""}`}
                  id="form-login"
                  onSubmit={handleLoginSubmit}
                  noValidate
                >
                  <div className={`field ${loginBadFields.email ? "bad shake" : ""}`} id="l-email">
                    <div className="block">
                      <label className="field-label" htmlFor="l-email-in">Email address</label>
                      <div className="input-row">
                        <input
                          id="l-email-in"
                          name="login_email"
                          type="email"
                          placeholder="Email address"
                          autoComplete="email"
                          value={loginEmail}
                          onFocus={(e) => {
                            e.currentTarget.placeholder = "";
                          }}
                          onBlur={(e) => {
                            if (!e.currentTarget.value) e.currentTarget.placeholder = "Email address";
                          }}
                          onChange={(e) => {
                            setLoginEmail(e.target.value);
                            if (loginBadFields.email) setLoginBadFields((b) => ({ ...b, email: false }));
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={`field ${loginBadFields.pw ? "bad shake" : ""}`} id="l-pw">
                    <div className="block">
                      <label className="field-label" htmlFor="l-pw-in">Password</label>
                      <div className="input-row">
                        <input
                          id="l-pw-in"
                          name="login_password"
                          type={showLoginPassword ? "text" : "password"}
                          placeholder="Password"
                          autoComplete="current-password"
                          value={loginPassword}
                          onFocus={(e) => {
                            e.currentTarget.placeholder = "";
                          }}
                          onBlur={(e) => {
                            if (!e.currentTarget.value) e.currentTarget.placeholder = "Password";
                          }}
                          onChange={(e) => {
                            setLoginPassword(e.target.value);
                            if (loginBadFields.pw) setLoginBadFields((b) => ({ ...b, pw: false }));
                          }}
                        />
                        <button
                          type="button"
                          className="eye"
                          onClick={() => setShowLoginPassword((s) => !s)}
                          aria-label="Show password"
                        >
                          {showLoginPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="row-line">
                    <label className="check"><input type="checkbox" defaultChecked /> Remember me</label>
                    <button type="button" className="link" id="forgot" onClick={handleForgot}>Forgot password?</button>
                  </div>
                  <p className={`msg ${loginMsg.kind ? loginMsg.kind : ""}`} role="status">
                    {loginMsg.text}
                  </p>
                  <button className={`submit ${loading ? "busy" : ""}`} type="submit" disabled={loading}>
                    <span className="label">Log in</span>
                    <span className="check-ico">✓</span>
                  </button>
                  <div className="or">or</div>
                  <button className="google" type="button" onClick={(e) => handleGoogle(e)} disabled={loading}>
                    <svg className="g" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13.5 17.7 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z"/>
                      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.8-6C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.7l7.8-6z"/>
                      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.7-4-13.6-9.8l-7.8 6C6.5 42.6 14.6 48 24 48z"/>
                    </svg>
                    <span>Log in with Google</span>
                  </button>

                  {showUnauthorizedDomain && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left text-xs text-amber-200 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300">
                        <span>⚠️ Domain Authorization Required</span>
                      </div>
                      <p className="text-[11px] text-[#D4D4D8] leading-relaxed">
                        Google blocked login from this domain. To enable Google Sign-In, add <code className="text-emerald-400 font-mono font-semibold">{typeof window !== "undefined" ? window.location.hostname : ""}</code> to <strong>Authorized domains</strong> in Firebase Console.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            if (typeof window !== "undefined") {
                              navigator.clipboard?.writeText(window.location.hostname);
                              setLoginMsg({ text: `Copied ${window.location.hostname} to clipboard!`, kind: "ok" });
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 font-bold text-[11px] transition cursor-pointer"
                        >
                          Copy Domain
                        </button>
                        <a
                          href={`https://console.firebase.google.com/project/${(firebaseConfig as any)?.projectId || "spend-d4b10"}/authentication/settings`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-emerald-400 underline hover:text-emerald-300 font-medium"
                        >
                          Open Firebase Settings →
                        </a>
                      </div>
                      <div className="text-[10px] text-[#A1A1AA] pt-1 border-t border-amber-500/20">
                        💡 Tip: Email & Password login works immediately without domain authorization!
                      </div>
                    </div>
                  )}
                </form>

                <p className="fine">
                  {tab === "signup"
                    ? "No card needed. You can delete your account any time."
                    : "New here? Switch to Sign up above."}
                </p>
              </>
            )}
          </section>
        </main>
      </div>
    </>
  );
};
