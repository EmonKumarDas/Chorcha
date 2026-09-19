export type UserProfile = {
    displayName: string;
    role: 'admin' | 'student';
    aiUsageCount?: number;
    aiUsageDate?: string;
    activeDeviceId?: string;
};

export type Subject = {
    id: string;
    subjectName: string;
    class: string;
    group: string;
    chapters: { name: string }[];
    icon: string;
    isFree: boolean;
};
