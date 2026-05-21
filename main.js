// ============================================================
// main.js – UI Logic for We4you Transport
// ============================================================

/* ── Navbar scroll effect ── */
const navbar  = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// Close mobile menu on link click
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

/* ── Intersection Observer: service cards fade-in ── */
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('[data-aos]').forEach(el => observer.observe(el));

/* ── Smooth anchor scrolling (offset for fixed nav) ── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = navbar.offsetHeight + 20;
    window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
  });
});

/* ── Quote Form Submission ── */
const form        = document.getElementById('quoteForm');
const btnText     = document.getElementById('btnText');
const btnLoader   = document.getElementById('btnLoader');
const formSuccess = document.getElementById('formSuccess');
const formError   = document.getElementById('formError');
const submitBtn   = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Reset messages
  formSuccess.classList.add('hidden');
  formError.classList.add('hidden');

  // Basic validation
  const required = ['name','email','origin','destination'];
  let valid = true;
  required.forEach(id => {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
      el.style.borderColor = '#f87171';
      valid = false;
    } else {
      el.style.borderColor = '';
    }
  });

  if (!valid) {
    formError.textContent = 'Please fill in all required fields marked with *.';
    formError.classList.remove('hidden');
    return;
  }

  // Email basic check
  const emailVal = document.getElementById('email').value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
    document.getElementById('email').style.borderColor = '#f87171';
    formError.textContent = 'Please enter a valid email address.';
    formError.classList.remove('hidden');
    return;
  }

  // Build data object
  const formData = {
    name:        document.getElementById('name').value.trim(),
    company:     document.getElementById('company').value.trim(),
    email:       emailVal.trim(),
    phone:       document.getElementById('phone').value.trim(),
    origin:      document.getElementById('origin').value.trim(),
    destination: document.getElementById('destination').value.trim(),
    freightType: document.getElementById('freight').value,
    weight:      document.getElementById('weight').value,
    message:     document.getElementById('message').value.trim(),
  };

  // Show loader
  btnText.classList.add('hidden');
  btnLoader.classList.remove('hidden');
  submitBtn.disabled = true;

  // Attempt Firebase submission
  try {
    // submitQuoteToFirebase is defined in app.js (module)
    // It may not be ready immediately, so we poll briefly
    let attempts = 0;
    while (typeof window.submitQuoteToFirebase !== 'function' && attempts < 20) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }

    const result = typeof window.submitQuoteToFirebase === 'function'
      ? await window.submitQuoteToFirebase(formData)
      : { ok: true, fallback: true };

    if (result.ok) {
      form.reset();
      formSuccess.textContent = result.fallback
        ? '✅ Quote request received! (Firebase not yet configured – see app.js)'
        : '✅ Quote request sent! We\'ll be in touch within 2 business hours.';
      formSuccess.classList.remove('hidden');
    } else {
      throw new Error(result.error || 'Unknown error');
    }
  } catch (err) {
    console.error(err);
    formError.textContent = 'Something went wrong. Please call us or email dispatch@we4youtransport.ca';
    formError.classList.remove('hidden');
  } finally {
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
    submitBtn.disabled = false;
  }
});

// Clear red border on input
form.querySelectorAll('input, select, textarea').forEach(el => {
  el.addEventListener('input', () => { el.style.borderColor = ''; });
});

/* ── Active nav link highlight ── */
const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-links a');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navItems.forEach(a => {
        a.style.color = a.getAttribute('href') === '#' + entry.target.id
          ? '#F0EDE8' : '';
      });
    }
  });
}, { threshold: 0.4 });

sections.forEach(s => sectionObserver.observe(s));

console.log('🚛 We4you Transport — ready to roll');
