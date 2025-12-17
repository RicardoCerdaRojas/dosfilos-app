import { Subscription } from './Subscription';

export interface User {
    id: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;

    // Subscription fields
    stripeCustomerId?: string;    // Stripe customer ID (at root level)
    subscription?: Subscription;  // Current subscription details

    createdAt: Date;
    updatedAt: Date;
}

export class UserEntity implements User {
    constructor(
        public id: string,
        public email: string,
        public displayName: string | null = null,
        public photoURL: string | null = null,
        public stripeCustomerId?: string,
        public subscription?: Subscription,
        public createdAt: Date = new Date(),
        public updatedAt: Date = new Date()
    ) { }

    static create(data: Partial<User> & { id: string; email: string }): UserEntity {
        return new UserEntity(
            data.id,
            data.email,
            data.displayName ?? null,
            data.photoURL ?? null,
            data.stripeCustomerId,
            data.subscription,
            data.createdAt ?? new Date(),
            data.updatedAt ?? new Date()
        );
    }

    updateProfile(displayName: string, photoURL?: string): UserEntity {
        return new UserEntity(
            this.id,
            this.email,
            displayName,
            photoURL ?? this.photoURL,
            this.stripeCustomerId,
            this.subscription,
            this.createdAt,
            new Date()
        );
    }
}
