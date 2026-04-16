const { createClient } = require('@supabase/supabase-js');
const hostDbUrl = process.env.HOST_DB_URL;
const hostDbKey = process.env.HOST_DB_SERVICE_ROLE_KEY;
const supabase = createClient(hostDbUrl || 'https://dummy.supabase.co', hostDbKey || 'dummy');

exports.getRestaurants = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('restaurants')
            .select(`*`)
            .in('status', ['published', 'active'])
            .order('rating', { ascending: false }); // Sort by rating for Dineout

        if (error) throw error;

        // Map the data to math the original RESTAURANTS_DATA structure so the frontend cards don't break
        const mappedData = data.map((rest, idx) => ({
            id: rest.id,
            name: rest.name,
            rating: rest.rating || "4.5",
            cuisines: rest.cuisines || "North Indian, Continental",
            costForTwo: rest.cost_for_two || "1,200",
            location: rest.address ? rest.address.substring(0, 15) : "City Center",
            fullAddress: rest.address || "City Center",
            distance: (Math.random() * 5 + 0.5).toFixed(1) + " km", 
            time: Math.floor(Math.random() * 45 + 15) + " mins",
            images: rest.images && rest.images.length > 0 ? rest.images : [
                "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
            ],
            menuImages: rest.menu_images && rest.menu_images.length > 0 ? rest.menu_images : [],
            about: rest.about || "Experience fine dining with top-tier cuisines.",
            phone: rest.phone || "No contact provided",
            mapLink: rest.location_url || "#",
            timings: `${rest.open_time || '10:00 AM'} - ${rest.close_time || '11:00 PM'}`,
            fssai: rest.fssai || "Pending Verification",
            tags: {
                promoted: idx === 0,
                discount: "Flat 20% OFF",
                discountGradient: "linear-gradient(to right, #f59e0b, #ef4444)"
            }
        }));

        res.json({
            success: true,
            data: mappedData
        });
    } catch (error) {
        console.error('Error fetching consumer restaurants:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch restaurants' });
    }
};

exports.trackMetrics = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.body;

        if (!['impression', 'click'].includes(type)) {
            return res.status(400).json({ success: false, error: 'Invalid metric type' });
        }

        const { error } = await supabase.rpc('increment_restaurant_metric', {
            restaurant_id: id,
            metric_type: type
        });

        if (error) throw error;

        res.json({ success: true, message: 'Metric tracked successfully' });
    } catch (error) {
        // Failing silently is acceptable for analytics since we don't want to break UX
        console.error(`[Analytics Error] Failed tracking ${req.body?.type} for ${req.params?.id}:`, error.message);
        res.status(500).json({ success: false, error: 'Internal tracking error' });
    }
};
