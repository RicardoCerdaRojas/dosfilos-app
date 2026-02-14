export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    photoUrl?: string;
    role: 'admin' | 'editor' | 'viewer'; // Example roles
    churchId?: string;
}
