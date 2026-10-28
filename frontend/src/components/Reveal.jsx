// components/Reveal.jsx
// Ek wrapper jo apne children ko tab fade-in + slide-up karta hai jab wo scroll karke
// screen par aate hain. Landing page par "smooth" feel ka bada hissa yahi hai.
// Ye IntersectionObserver use karta hai (browser ka built-in tool jo batata hai ki
// koi element screen par dikha ya nahi), isliye koi extra library nahi chahiye.

import { useEffect, useRef, useState } from 'react';

// delay = kitne milliseconds baad animation shuru ho (cards ko ek ke baad ek dikhane ke liye)
function Reveal({ children, delay = 0, className = '' }) {
  // ref = isse hum us <div> ko pakadte hain jise observe karna hai
  const ref = useRef(null);

  // false = abhi chhupa hua, true = dikha do
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Purane browser me IntersectionObserver nahi hota: wahan seedha dikha do,
    // warna content hamesha invisible reh jayega
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }

    // Jab element ka 15% hissa screen par aa jaye, tab visible = true kar do
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          // Ek baar dikh gaya to kaam khatam: dobara hide nahi karna
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(element);

    // Cleanup: component hatne par observer band kar do
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      // motion-reduce: jin logon ne OS me "reduce motion" on kiya hai unke liye
      // animation band, content seedha dikhega
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-6 motion-reduce:opacity-100 motion-reduce:translate-y-0'
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default Reveal;