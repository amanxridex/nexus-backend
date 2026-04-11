const { createClient } = require('@supabase/supabase-js');

// Initialize Host Supabase Client where gyms live
const hostDbUrl = process.env.HOST_DB_URL;
const hostDbKey = process.env.HOST_DB_SERVICE_ROLE_KEY;

if (!hostDbUrl || !hostDbKey) {
    console.error("CRITICAL ERROR: HOST_DB_URL or HOST_DB_SERVICE_ROLE_KEY missing in environment.");
}

const supabase = createClient(hostDbUrl || 'https://dummy.supabase.co', hostDbKey || 'dummy');

exports.getGyms = async (req, res) => {
  try {
    if (!hostDbUrl) throw new Error("HOST_DB is not configured on this server");

    const { data: gyms, error } = await supabase
      .from('gyms')
      .select(`
        *,
        hosts ( id, business_name, full_name, avatar_url, phone )
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching gyms:', error);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    res.status(200).json({
      success: true,
      count: gyms.length,
      data: gyms
    });

  } catch (error) {
    console.error('Error fetching gyms:', error);
    res.status(500).json({ success: false, message: 'Server error fetching gyms' });
  }
};
