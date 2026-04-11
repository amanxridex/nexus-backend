const supabase = require('../config/database');

exports.getApprovedHomes = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('properties')
            .select(`
                *,
                hosts ( business_name, city, user_name, phone_number, avatar_url )
            `)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.status(200).json({
            success: true,
            data: data
        });
    } catch (err) {
        console.error("Error fetching homes:", err.message);
        res.status(500).json({ success: false, message: "Server error fetching homes" });
    }
};
