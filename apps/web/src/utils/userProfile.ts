export interface UserProfile {
  id?: string;
  email: string;
  name: string;
  role: 'admin' | 'faculty' | 'guest';
  assigned_subject: string;
}

export function getUserProfile(): UserProfile {
  try {
    const saved = localStorage.getItem('eduforge_user');
    if (saved) {
      const u = JSON.parse(saved);
      const email = (u.email || '').toLowerCase().trim();
      const role = u.role === 'admin' ? 'admin' : (u.role || 'faculty');

      // 1. Explicit assigned_subject saved in profile
      if (u.assigned_subject && u.assigned_subject !== 'None') {
        return {
          id: u.id,
          email: u.email || email,
          name: u.name || (email.split('@')[0] || 'User'),
          role: role,
          assigned_subject: role === 'admin' ? 'All' : u.assigned_subject
        };
      }

      // 2. Default rule by admin check
      if (role === 'admin' || email === 'admin@eduforge.com' || email.startsWith('admin')) {
        return {
          id: u.id,
          email: u.email || 'admin@eduforge.com',
          name: u.name || 'System Admin',
          role: 'admin',
          assigned_subject: 'All'
        };
      }

      // 3. Email-based defaults for legacy logins
      if (email.includes('physics') || email.includes('phy')) {
        return {
          id: u.id,
          email: u.email || 'physics@eduforge.com',
          name: u.name || 'Physics Faculty',
          role: 'faculty',
          assigned_subject: 'Physics'
        };
      }

      if (email.includes('chemistry') || email.includes('chem')) {
        return {
          id: u.id,
          email: u.email || 'chemistry@eduforge.com',
          name: u.name || 'Chemistry Faculty',
          role: 'faculty',
          assigned_subject: 'Chemistry'
        };
      }

      if (email.includes('biology') || email.includes('bio')) {
        return {
          id: u.id,
          email: u.email || 'biology@eduforge.com',
          name: u.name || 'Biology Faculty',
          role: 'faculty',
          assigned_subject: 'Biology'
        };
      }

      if (email.includes('maths') || email.includes('math')) {
        return {
          id: u.id,
          email: u.email || 'maths@eduforge.com',
          name: u.name || 'Mathematics Faculty',
          role: 'faculty',
          assigned_subject: 'Mathematics'
        };
      }

      return {
        id: u.id,
        email: u.email || email,
        name: u.name || (email.split('@')[0] || 'Faculty Member'),
        role: role,
        assigned_subject: u.assigned_subject || 'Physics'
      };
    }
  } catch {}

  return {
    email: 'admin@eduforge.com',
    name: 'Administrator',
    role: 'admin',
    assigned_subject: 'All'
  };
}
