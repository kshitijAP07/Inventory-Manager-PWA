/**
 * IM Platform — Authentication Service
 * 
 * Uses Supabase Auth for email/password login.
 * Manages sessions and route guards.
 * 
 * Dependencies: supabase-config.js must be loaded first.
 */

const IMAuth = {
    /**
     * Role → dashboard redirect mapping.
     * Paths are relative to the IM root directory.
     */
    ROLE_REDIRECTS: {
        manager: './MANAGER_PWA/manager-dashboard.html',
        inventory_manager: './Inventory_Manager_PWA/im-dashboard.html',
        operator: './Operator_PWA/home.html'
    },

    /**
     * Sign in with email and password.
     * @param {string} email 
     * @param {string} password 
     * @returns {{ user, role, error }}
     */
    async login(email, password) {
        try {
            const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) return { user: null, role: null, error: error.message };

            // Fetch role from the users table
            const { data: profile, error: profileError } = await _supabase
                .from('users')
                .select('role, display_name, avatar_url')
                .eq('id', data.user.id)
                .single();

            if (profileError) return { user: data.user, role: null, error: 'User profile not found.' };

            // Store role in sessionStorage for quick access
            sessionStorage.setItem('im_user_role', profile.role);
            sessionStorage.setItem('im_user_name', profile.display_name || '');
            sessionStorage.setItem('im_user_id', data.user.id);
            sessionStorage.setItem('im_user_email', data.user.email);

            return { user: data.user, role: profile.role, error: null };
        } catch (err) {
            return { user: null, role: null, error: err.message };
        }
    },

    /**
     * Sign out the current user.
     * @param {string} [loginPath] - Relative path to login page from current page
     */
    async logout(loginPath) {
        await _supabase.auth.signOut();
        sessionStorage.clear();
        window.location.href = loginPath || '../../login.html';
    },

    /**
     * Get current authenticated user info.
     * @returns {{ id, email, role, display_name } | null}
     */
    async getCurrentUser() {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) return null;

        const role = sessionStorage.getItem('im_user_role');
        if (role) {
            return {
                id: user.id,
                email: user.email,
                role,
                display_name: sessionStorage.getItem('im_user_name') || ''
            };
        }

        // Re-fetch from DB if not in sessionStorage
        const { data: profile } = await _supabase
            .from('users')
            .select('role, display_name')
            .eq('id', user.id)
            .single();

        if (profile) {
            sessionStorage.setItem('im_user_role', profile.role);
            sessionStorage.setItem('im_user_name', profile.display_name);
            sessionStorage.setItem('im_user_id', user.id);
        }

        return {
            id: user.id,
            email: user.email,
            role: profile?.role || null,
            display_name: profile?.display_name || ''
        };
    },

    /**
     * Route guard — redirects to login if not authenticated or wrong role.
     * Call at the top of every protected page.
     * @param {string[]} allowedRoles - e.g. ['manager'] or ['manager', 'inventory_manager']
     * @param {string} [loginPath] - Relative path to login.html from the current page
     */
    async requireAuth(allowedRoles, loginPath) {
        const user = await this.getCurrentUser();
        const redirect = loginPath || '../../login.html';

        if (!user) {
            window.location.href = redirect;
            return null;
        }

        if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
            window.location.href = redirect;
            return null;
        }

        return user;
    },

    /**
     * Get the redirect path for a given role.
     * @param {string} role 
     * @returns {string}
     */
    getRedirectForRole(role) {
        return this.ROLE_REDIRECTS[role] || 'login.html';
    }
};
