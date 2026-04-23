const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, displayName, company, requesterId } = req.body;

  // Only allow your specific user ID to call this
  const ADMIN_USER_ID = process.env.ADMIN_USER_ID;
  if (requesterId !== ADMIN_USER_ID) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    // Generate a random temporary password
    const tempPassword = Math.random().toString(36).slice(-10) + 'Aa1!';

    // Create the auth user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (userError) throw userError;

    const userId = userData.user.id;

    // Insert into supervisors table
    await supabase.from('supervisors').insert({
      id: userId,
      display_name: displayName || '',
      company: company || '',
    });

    // Set role to supervisor
    await supabase.from('user_roles').insert({
      id: userId,
      role: 'supervisor',
    });

    res.status(200).json({ success: true, tempPassword, userId });
  } catch (err) {
    console.error('Create supervisor error:', err.message);
    res.status(500).json({ error: err.message });
  }
};