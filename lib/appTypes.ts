export interface AppDoc {
  id: string;
  userId: string;
  name: string;           // Tên hiển thị của app
  bundleId: string;       // com.yourcompany.app
  teamId: string;         // Apple Team ID
  scheme: string;         // Xcode scheme name
  xcworkspace: string;    // e.g. MyApp.xcworkspace
  xcodeproj: string;      // e.g. MyApp.xcodeproj
  githubRepo?: string | null; // "owner/repo" — mỗi app chỉ connect 1 repo
  createdAt?: { seconds: number } | null;
  updatedAt?: { seconds: number } | null;
}

export type AppFormData = Omit<AppDoc, "id" | "userId" | "createdAt" | "updatedAt">;

export const APP_FORM_FIELDS: {
  key: keyof AppFormData;
  label: string;
  placeholder: string;
  hint?: string;
}[] = [
  { key: "name",        label: "App Name",      placeholder: "My Awesome App" },
  { key: "bundleId",    label: "Bundle ID",      placeholder: "com.yourcompany.app",     hint: "Phải trùng với Bundle ID trên Apple Developer Portal" },
  { key: "teamId",      label: "Team ID",        placeholder: "XXXXXXXXXX",              hint: "Apple Developer Team ID (10 ký tự)" },
  { key: "scheme",      label: "Scheme Name",    placeholder: "MyApp" },
  { key: "xcworkspace", label: "Xcworkspace",    placeholder: "MyApp.xcworkspace" },
  { key: "xcodeproj",   label: "Xcodeproj",      placeholder: "MyApp.xcodeproj" },
];

