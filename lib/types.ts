export type Role = "admin" | "leader" | "intern";
export type TaskStatus = "pending" | "in_progress" | "completed";
export type UserStatus = "active" | "disabled";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  group_id: string | null;
  status: UserStatus;
  force_password_change: boolean;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  leader_id: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  group_id: string;
  assignee_id: string;
  created_by: string;
  title: string;
  description: string;
  deadline: string | null;
  status: TaskStatus;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface TaskNote {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface Feedback {
  id: string;
  group_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

// Minimal Database type so the Supabase JS client can be parameterized.
// Hand-written rather than generated for this deliverable; running
// `supabase gen types typescript` against your project will produce a
// fuller version you can drop in as your schema evolves.
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      groups: { Row: Group; Insert: Partial<Group>; Update: Partial<Group> };
      tasks: { Row: Task; Insert: Partial<Task>; Update: Partial<Task> };
      task_notes: { Row: TaskNote; Insert: Partial<TaskNote>; Update: Partial<TaskNote> };
      feedback: { Row: Feedback; Insert: Partial<Feedback>; Update: Partial<Feedback> };
      feedback_weeks: {
        Row: { intern_id: string; group_id: string; week_start: string; created_at: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Functions: {
      submit_feedback: {
        Args: { p_group_id: string; p_rating: number; p_comment: string };
        Returns: void;
      };
      has_submitted_feedback_this_week: {
        Args: { p_group_id: string };
        Returns: boolean;
      };
      assign_group_leader: {
        Args: { p_group_id: string; p_leader_id: string };
        Returns: void;
      };
      mark_password_changed: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
  };
}
