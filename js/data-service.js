/**
 * IM Platform — Data Service
 * 
 * Centralized CRUD operations for all Supabase tables.
 * Uses JSONB columns for flexible metadata storage.
 * 
 * Dependencies: supabase-config.js must be loaded first.
 */

const IMData = {

    // ═══════════════════════════════════════════
    //  WORKSTATIONS
    // ═══════════════════════════════════════════

    async getWorkstations() {
        const { data, error } = await _supabase
            .from('workstations')
            .select('*')
            .order('code', { ascending: true });
        if (error) console.error('[IMData] getWorkstations:', error.message);
        return data || [];
    },

    async getWorkstationById(id) {
        const { data, error } = await _supabase
            .from('workstations')
            .select('*')
            .eq('id', id)
            .single();
        if (error) console.error('[IMData] getWorkstationById:', error.message);
        return data;
    },

    async getWorkstationByCode(code) {
        const { data, error } = await _supabase
            .from('workstations')
            .select('*')
            .eq('code', code)
            .single();
        if (error) console.error('[IMData] getWorkstationByCode:', error.message);
        return data;
    },

    async updateWorkstation(id, updates) {
        const { data, error } = await _supabase
            .from('workstations')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) console.error('[IMData] updateWorkstation:', error.message);
        return { data, error };
    },

    // ═══════════════════════════════════════════
    //  ASSEMBLY LINES
    // ═══════════════════════════════════════════

    async getAssemblyLines() {
        const { data, error } = await _supabase
            .from('assembly_lines')
            .select('*')
            .order('code', { ascending: true });
        if (error) console.error('[IMData] getAssemblyLines:', error.message);
        return data || [];
    },

    async getAssemblyLineById(id) {
        const { data, error } = await _supabase
            .from('assembly_lines')
            .select('*')
            .eq('id', id)
            .single();
        if (error) console.error('[IMData] getAssemblyLineById:', error.message);
        return data;
    },

    // ═══════════════════════════════════════════
    //  TASKS
    // ═══════════════════════════════════════════

    async getTasks(filters = {}) {
        let query = _supabase
            .from('tasks')
            .select(`
                *,
                workstation:workstations(id, code, name),
                assignee:users!tasks_assigned_to_fkey(id, display_name, avatar_url),
                assigner:users!tasks_assigned_by_fkey(id, display_name)
            `)
            .order('created_at', { ascending: false });

        if (filters.workstation_id) query = query.eq('workstation_id', filters.workstation_id);
        if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
        if (filters.assigned_by) query = query.eq('assigned_by', filters.assigned_by);
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.limit) query = query.limit(filters.limit);

        const { data, error } = await query;
        if (error) console.error('[IMData] getTasks:', error.message);
        return data || [];
    },

    async getTaskById(id) {
        const { data, error } = await _supabase
            .from('tasks')
            .select(`
                *,
                workstation:workstations(id, code, name),
                assignee:users!tasks_assigned_to_fkey(id, display_name, avatar_url),
                assigner:users!tasks_assigned_by_fkey(id, display_name)
            `)
            .eq('id', id)
            .single();
        if (error) console.error('[IMData] getTaskById:', error.message);
        return data;
    },

    async createTask(taskData) {
        const { data, error } = await _supabase
            .from('tasks')
            .insert({
                name: taskData.name,
                description: taskData.description || '',
                workstation_id: taskData.workstation_id,
                assigned_to: taskData.assigned_to,
                assigned_by: taskData.assigned_by,
                status: taskData.status || 'pending',
                duration_minutes: taskData.duration_minutes || 0,
                scheduled_time: taskData.scheduled_time || new Date().toISOString(),
                metadata: taskData.metadata || {}
            })
            .select()
            .single();
        if (error) console.error('[IMData] createTask:', error.message);
        return { data, error };
    },

    async updateTask(id, updates) {
        const { data, error } = await _supabase
            .from('tasks')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) console.error('[IMData] updateTask:', error.message);
        return { data, error };
    },

    async deleteTask(id) {
        const { error } = await _supabase
            .from('tasks')
            .delete()
            .eq('id', id);
        if (error) console.error('[IMData] deleteTask:', error.message);
        return { error };
    },

    // ═══════════════════════════════════════════
    //  INVENTORY ITEMS
    // ═══════════════════════════════════════════

    async getInventoryItems(filters = {}) {
        let query = _supabase
            .from('inventory_items')
            .select('*')
            .order('name', { ascending: true });

        if (filters.category) query = query.eq('category', filters.category);
        if (filters.stock_status) query = query.eq('stock_status', filters.stock_status);
        if (filters.search) query = query.ilike('name', `%${filters.search}%`);

        const { data, error } = await query;
        if (error) console.error('[IMData] getInventoryItems:', error.message);
        return data || [];
    },

    async getInventoryItemById(id) {
        const { data, error } = await _supabase
            .from('inventory_items')
            .select('*')
            .eq('id', id)
            .single();
        if (error) console.error('[IMData] getInventoryItemById:', error.message);
        return data;
    },

    async createInventoryItem(itemData) {
        // Auto-determine stock_status
        let stock_status = 'adequate';
        if (itemData.quantity <= 0) stock_status = 'out_of_stock';
        else if (itemData.min_threshold && itemData.quantity <= itemData.min_threshold * 0.5) stock_status = 'critical';
        else if (itemData.min_threshold && itemData.quantity <= itemData.min_threshold) stock_status = 'low';

        const { data, error } = await _supabase
            .from('inventory_items')
            .insert({
                name: itemData.name,
                category: itemData.category || '',
                batch_number: itemData.batch_number || '',
                qr_code: itemData.qr_code || '',
                quantity: itemData.quantity || 0,
                unit: itemData.unit || 'units',
                min_threshold: itemData.min_threshold || 0,
                max_capacity: itemData.max_capacity || 0,
                stock_status,
                location: itemData.location || {},
                supplier_info: itemData.supplier_info || {},
                storage_notes: itemData.storage_notes || '',
                last_updated_by: itemData.last_updated_by || []
            })
            .select()
            .single();
        if (error) console.error('[IMData] createInventoryItem:', error.message);
        return { data, error };
    },

    async updateInventoryItem(id, updates) {
        // Re-calculate stock_status if quantity changed
        if (updates.quantity !== undefined) {
            const existing = await this.getInventoryItemById(id);
            if (existing) {
                const threshold = updates.min_threshold || existing.min_threshold;
                const qty = updates.quantity;
                if (qty <= 0) updates.stock_status = 'out_of_stock';
                else if (threshold && qty <= threshold * 0.5) updates.stock_status = 'critical';
                else if (threshold && qty <= threshold) updates.stock_status = 'low';
                else updates.stock_status = 'adequate';
            }
        }

        const { data, error } = await _supabase
            .from('inventory_items')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) console.error('[IMData] updateInventoryItem:', error.message);
        return { data, error };
    },

    // ═══════════════════════════════════════════
    //  OPERATORS (users with role='operator')
    // ═══════════════════════════════════════════

    async getOperators() {
        const { data, error } = await _supabase
            .from('users')
            .select('*')
            .eq('role', 'operator')
            .order('display_name', { ascending: true });
        if (error) console.error('[IMData] getOperators:', error.message);
        return data || [];
    },

    async getAllUsers() {
        const { data, error } = await _supabase
            .from('users')
            .select('*')
            .order('display_name', { ascending: true });
        if (error) console.error('[IMData] getAllUsers:', error.message);
        return data || [];
    },

    // ═══════════════════════════════════════════
    //  ALERTS
    // ═══════════════════════════════════════════

    async getAlerts(role) {
        let query = _supabase
            .from('alerts')
            .select('*')
            .order('created_at', { ascending: false });

        if (role) query = query.contains('target_roles', [role]);

        const { data, error } = await query;
        if (error) console.error('[IMData] getAlerts:', error.message);
        return data || [];
    },

    async getUnreadAlertCount(role) {
        let query = _supabase
            .from('alerts')
            .select('id', { count: 'exact', head: true })
            .eq('is_read', false);

        if (role) query = query.contains('target_roles', [role]);

        const { count, error } = await query;
        if (error) console.error('[IMData] getUnreadAlertCount:', error.message);
        return count || 0;
    },

    async markAlertRead(id) {
        const { error } = await _supabase
            .from('alerts')
            .update({ is_read: true })
            .eq('id', id);
        if (error) console.error('[IMData] markAlertRead:', error.message);
        return { error };
    },

    async createAlert(alertData) {
        const { data, error } = await _supabase
            .from('alerts')
            .insert({
                type: alertData.type || 'warning',
                source_id: alertData.source_id || '',
                title: alertData.title,
                description: alertData.description || '',
                metadata: alertData.metadata || {},
                is_read: false,
                target_roles: alertData.target_roles || ['manager']
            })
            .select()
            .single();
        if (error) console.error('[IMData] createAlert:', error.message);
        return { data, error };
    },

    // ═══════════════════════════════════════════
    //  KITS
    // ═══════════════════════════════════════════

    async getKits() {
        const { data, error } = await _supabase
            .from('kits')
            .select(`*, workstation:workstations(id, code, name)`)
            .order('created_at', { ascending: false });
        if (error) console.error('[IMData] getKits:', error.message);
        return data || [];
    },

    async createKit(kitData) {
        const { data, error } = await _supabase
            .from('kits')
            .insert({
                name: kitData.name || 'Untitled Kit',
                items: kitData.items || [],
                workstation_id: kitData.workstation_id || null,
                status: kitData.status || 'created',
                created_by: kitData.created_by
            })
            .select()
            .single();
        if (error) console.error('[IMData] createKit:', error.message);
        return { data, error };
    },

    // ═══════════════════════════════════════════
    //  ISSUES
    // ═══════════════════════════════════════════

    async createIssue(issueData) {
        const { data, error } = await _supabase
            .from('issues')
            .insert({
                type: issueData.type,
                kit_id: issueData.kit_id || null,
                material_id: issueData.material_id || null,
                reason: issueData.reason || '',
                description: issueData.description || '',
                raised_by: issueData.raised_by,
                status: 'open'
            })
            .select()
            .single();
        if (error) console.error('[IMData] createIssue:', error.message);
        return { data, error };
    },

    async getIssues(filters = {}) {
        let query = _supabase
            .from('issues')
            .select(`
                *,
                raiser:users!issues_raised_by_fkey(id, display_name)
            `)
            .order('created_at', { ascending: false });

        if (filters.raised_by) query = query.eq('raised_by', filters.raised_by);
        if (filters.status) query = query.eq('status', filters.status);

        const { data, error } = await query;
        if (error) console.error('[IMData] getIssues:', error.message);
        return data || [];
    },

    // ═══════════════════════════════════════════
    //  EFFICIENCY DATA
    // ═══════════════════════════════════════════

    async getEfficiencyData(period = 'today') {
        const { data, error } = await _supabase
            .from('efficiency_stats')
            .select('*')
            .eq('period', period)
            .single();

        if (error || !data) {
            // Return default if no stats exist yet
            const defaults = { today: 85, weekly: 72, yearly: 91 };
            return { value: defaults[period] || 85 };
        }
        return data;
    },

    // ═══════════════════════════════════════════
    //  REALTIME SUBSCRIPTIONS
    // ═══════════════════════════════════════════

    /**
     * Subscribe to real-time changes on a table.
     * @param {string} table - Table name
     * @param {function} callback - Called with { eventType, new, old }
     * @returns {object} channel - Call channel.unsubscribe() to stop
     */
    subscribe(table, callback) {
        const channel = _supabase
            .channel(`realtime-${table}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table },
                (payload) => {
                    callback({
                        eventType: payload.eventType,
                        new: payload.new,
                        old: payload.old
                    });
                }
            )
            .subscribe();

        console.log(`[IMData] Subscribed to realtime: ${table}`);
        return channel;
    },

    /**
     * Subscribe to a specific row by filter.
     */
    subscribeToRow(table, column, value, callback) {
        const channel = _supabase
            .channel(`realtime-${table}-${value}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table, filter: `${column}=eq.${value}` },
                (payload) => callback({ eventType: payload.eventType, new: payload.new, old: payload.old })
            )
            .subscribe();
        return channel;
    }
};
