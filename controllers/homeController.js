const { createClient } = require('@supabase/supabase-js');

// Initialize Host Supabase Client where properties live
const hostDbUrl = process.env.HOST_DB_URL;
const hostDbKey = process.env.HOST_DB_SERVICE_ROLE_KEY;

if (!hostDbUrl || !hostDbKey) {
    console.error("CRITICAL ERROR: HOST_DB_URL or HOST_DB_SERVICE_ROLE_KEY missing in environment.");
}

const supabase = createClient(hostDbUrl || 'https://dummy.supabase.co', hostDbKey || 'dummy');

exports.getApprovedHomes = async (req, res) => {
    try {
        if (!hostDbUrl) throw new Error("HOST_DB is not configured on this server");

        const { data, error } = await supabase
            .from('properties')
            .select(`
                *,
                hosts ( business_name, city, full_name, phone, avatar_url )
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
