# AI Rules and Project Guidelines for CleanOS

This document outlines the core technologies used in the CleanOS application and provides guidelines for using specific libraries and tools.

## 1. Tech Stack Overview

CleanOS is a modern web application built with the following technologies:

*   **Frontend:** React with TypeScript, bundled using Vite.
*   **Styling:** Tailwind CSS for utility-first styling.
*   **UI Library:** shadcn/ui (built on Radix UI) for high-quality, accessible components.
*   **Backend & Database:** Supabase (PostgreSQL, Auth, Storage, Edge Functions).
*   **Data Management:** TanStack Query (`@tanstack/react-query`) for server state management.
*   **Routing:** React Router DOM.
*   **Forms & Validation:** React Hook Form integrated with Zod.
*   **Icons:** Lucide React.
*   **Date Handling:** `date-fns`.

## 2. Library Usage Rules

To maintain consistency, performance, and readability, adhere to the following rules when implementing features:

| Feature | Recommended Library/Tool | Notes |
| :--- | :--- | :--- |
| **UI Components** | shadcn/ui (`@/components/ui/*`) | Always prioritize existing shadcn components. If a new component is needed, build it using Tailwind CSS in `src/components/`. |
| **Styling** | Tailwind CSS | Use utility classes exclusively. All components must be responsive. |
| **Icons** | `lucide-react` | Use only icons imported from `lucide-react`. |
| **Routing** | `react-router-dom` | Use `BrowserRouter`, `Routes`, and `Route` for navigation. Keep main routes in `src/App.tsx`. |
| **Data Fetching/Mutation** | `@tanstack/react-query` | Use `useQuery` and `useMutation` for all asynchronous data operations involving the backend. |
| **Backend/Database** | `supabase` (`@/integrations/supabase/client`) | All database and authentication interactions must use the pre-configured Supabase client. |
| **Forms** | `react-hook-form` + `zod` | Use React Hook Form for form state and validation schema definition via Zod. |
| **Notifications (General)** | `sonner` | Use `toast.success()`, `toast.error()`, etc., from `sonner` for general user feedback (bottom-left corner). |
| **Notifications (System/Form Errors)** | `useToast` (`@/hooks/use-toast`) | Use the custom `useToast` hook for destructive/system-level error messages (top-right corner). |
| **Date & Time** | `date-fns` | Use `date-fns` for all date formatting, manipulation, and comparison (e.g., `format`, `isSameDay`). |