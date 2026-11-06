// Contact details (taken from the previous portfolio's Contact section). A missing/invalid email or URL simply shows no icon.
//   email    : 'name@domain.tld'
//   github   : 'https://github.com/<your-username>'
//   linkedin : 'https://www.linkedin.com/in/<your-profile>'
//   instagram: 'https://www.instagram.com/<your-username>/'
//   origin   : hometown, shown as ORIGIN          based : current city, shown as CURRENTLY IN
export const CONTACT = {
  email: 'acharyautsab68@gmail.com',
  github: 'https://github.com/Ut5ab07',
  linkedin: 'https://www.linkedin.com/in/utsab-raj-acharya',
  instagram: 'https://www.instagram.com/utsab.acharya.7/',
  origin: 'Pokhara, Nepal',
  based: 'Bangalore, India',
};

// Email links open Gmail's compose window with the address filled in (in a new tab), in both editions.
export const gmailCompose = (email) => `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
