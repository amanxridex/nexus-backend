const { hostDb } = require('../config/supabase');

exports.getGyms = async (req, res) => {
  try {
    const { data: gyms, error } = await hostDb
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
