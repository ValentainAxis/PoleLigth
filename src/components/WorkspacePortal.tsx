import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { Theme, Vision } from "../types";
import {
  googleSignIn,
  logout,
  getAccessToken,
  initAuth
} from "../utils/googleAuth";
import {
  Calendar,
  Mail,
  CheckSquare,
  HardDrive,
  FileText,
  Send,
  Plus,
  Trash2,
  RefreshCw,
  LogOut,
  Clock,
  User as UserIcon,
  HardDriveUpload,
  Check,
  AlertCircle,
  FolderOpen
} from "lucide-react";

interface WorkspacePortalProps {
  activeTheme: Theme;
  visions: Vision[];
  isAudioEnabled: boolean;
  onTriggerRipple: () => void;
}

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

interface GmailMessage {
  id: string;
  snippet: string;
  subject?: string;
  from?: string;
  date?: string;
}

interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: "needsAction" | "completed";
}

interface GoogleTaskList {
  id: string;
  title: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  size?: string;
}

interface KeepNote {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: string;
}

const KEEP_COLORS = [
  { name: "Трава", value: "rgba(16, 185, 129, 0.2)" },
  { name: "Рассвет", value: "rgba(244, 63, 94, 0.2)" },
  { name: "Ночь", value: "rgba(251, 191, 36, 0.2)" },
  { name: "Сумерки", value: "rgba(139, 92, 246, 0.2)" },
  { name: "Пепел", value: "rgba(255, 255, 255, 0.1)" }
];

export default function WorkspacePortal({
  activeTheme,
  visions,
  isAudioEnabled,
  onTriggerRipple
}: WorkspacePortalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<"calendar" | "gmail" | "tasks" | "drive" | "keep">("calendar");

  // Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Data States
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedTaskList, setSelectedTaskList] = useState<string>("");
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [keepNotes, setKeepNotes] = useState<KeepNote[]>([]);
  const [keepFileId, setKeepFileId] = useState<string | null>(null);

  // Forms Input States
  const [newEvTitle, setNewEvTitle] = useState("");
  const [newEvDate, setNewEvDate] = useState("");
  const [newEvTime, setNewEvTime] = useState("");
  const [newEvDesc, setNewEvDesc] = useState("");

  const [mailTo, setMailTo] = useState("");
  const [mailSubj, setMailSubj] = useState("");
  const [mailBody, setMailBody] = useState("");

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");

  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteColor, setNewNoteColor] = useState(KEEP_COLORS[0].value);

  // Initialize and check token
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
        setNeedsAuth(false);
      },
      () => {
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch relevant tab data
  useEffect(() => {
    if (token && !needsAuth) {
      fetchTabData();
    }
  }, [token, needsAuth, activeTab]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg("");
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        onTriggerRipple();
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      setErrorMsg("Ошибка авторизации Google Workspace. Убедитесь, что вы предоставили доступ.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setNeedsAuth(true);
      onTriggerRipple();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const fetchTabData = async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMsg("");
    try {
      if (activeTab === "calendar") {
        await fetchCalendarEvents();
      } else if (activeTab === "gmail") {
        await fetchEmails();
      } else if (activeTab === "tasks") {
        await fetchTaskLists();
      } else if (activeTab === "drive") {
        await fetchDriveFiles();
      } else if (activeTab === "keep") {
        await fetchKeepNotes();
      }
    } catch (err: any) {
      console.error(`Error loading ${activeTab}:`, err);
      setErrorMsg(`Не удалось связаться со сферой ${activeTab}. Возможно, требуется повторный вход.`);
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== GOOGLE CALENDAR API ====================
  const fetchCalendarEvents = async () => {
    const now = new Date().toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=8&orderBy=startTime&singleEvents=true&timeMin=${now}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Calendar fetch failed");
    const data = await res.json();
    setEvents(data.items || []);
  };

  const createCalendarEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvTitle || !newEvDate || !newEvTime) return;

    setIsActionLoading(true);
    try {
      const startDateTime = new Date(`${newEvDate}T${newEvTime}`).toISOString();
      // default duration 1 hour
      const endDateTime = new Date(new Date(`${newEvDate}T${newEvTime}`).getTime() + 60 * 60 * 1000).toISOString();

      const body = {
        summary: newEvTitle,
        description: newEvDesc || "Создано через портал созерцания 'Поля Ликования'.",
        start: { dateTime: startDateTime },
        end: { dateTime: endDateTime }
      };

      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error("Could not create calendar event");
      onTriggerRipple();
      setNewEvTitle("");
      setNewEvDate("");
      setNewEvTime("");
      setNewEvDesc("");
      await fetchCalendarEvents();
    } catch (err) {
      console.error(err);
      setErrorMsg("Ошибка при записи события в Календарь.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // ==================== GMAIL API ====================
  const fetchEmails = async () => {
    const listUrl = "https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=label:INBOX";
    const res = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Gmail list fetch failed");
    const listData = await res.json();

    if (!listData.messages || listData.messages.length === 0) {
      setEmails([]);
      return;
    }

    const emailDetails: GmailMessage[] = [];
    for (const msg of listData.messages) {
      const detailRes = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        const headers = detailData.payload?.headers || [];
        const subject = headers.find((h: any) => h.name === "Subject")?.value || "Без темы";
        const from = headers.find((h: any) => h.name === "From")?.value || "Неизвестный отправитель";
        const dateHeader = headers.find((h: any) => h.name === "Date")?.value;
        const date = dateHeader ? new Date(dateHeader).toLocaleDateString() : "";

        emailDetails.push({
          id: msg.id,
          snippet: detailData.snippet || "",
          subject,
          from,
          date
        });
      }
    }
    setEmails(emailDetails);
  };

  const sendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mailTo || !mailSubj || !mailBody) return;

    // Confirm email sending
    const confirmed = window.confirm(`Вы уверены, что хотите отправить письмо на адрес ${mailTo}?`);
    if (!confirmed) return;

    setIsActionLoading(true);
    try {
      const emailContent = [
        `To: ${mailTo}`,
        `Subject: ${mailSubj}`,
        'Content-Type: text/plain; charset="UTF-8"',
        "",
        mailBody
      ].join("\r\n");

      // base64url encoding
      const base64Encoded = btoa(unescape(encodeURIComponent(emailContent)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const res = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ raw: base64Encoded })
      });

      if (!res.ok) throw new Error("Email sending failed");
      onTriggerRipple();
      setMailTo("");
      setMailSubj("");
      setMailBody("");
      alert("Ваше послание унесено ветром адресату.");
    } catch (err) {
      console.error(err);
      setErrorMsg("Ошибка при отправке письма через Gmail.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // ==================== GOOGLE TASKS API ====================
  const fetchTaskLists = async () => {
    const listUrl = "https://www.googleapis.com/tasks/v1/users/@me/lists";
    const res = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Tasklists fetch failed");
    const data = await res.json();
    const lists = data.items || [];
    setTaskLists(lists);

    if (lists.length > 0) {
      const defaultList = lists[0].id;
      setSelectedTaskList(defaultList);
      await fetchTasksForList(defaultList);
    }
  };

  const fetchTasksForList = async (listId: string) => {
    const tasksUrl = `https://www.googleapis.com/tasks/v1/lists/${listId}/tasks?maxResults=20&showCompleted=true`;
    const res = await fetch(tasksUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Tasks fetch failed");
    const data = await res.json();
    setTasks(data.items || []);
  };

  const handleTaskListChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const listId = e.target.value;
    setSelectedTaskList(listId);
    setIsLoading(true);
    try {
      await fetchTasksForList(listId);
    } catch (err) {
      console.error(err);
      setErrorMsg("Не удалось загрузить задачи для выбранного списка.");
    } finally {
      setIsLoading(false);
    }
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle || !selectedTaskList) return;

    setIsActionLoading(true);
    try {
      const res = await fetch(`https://www.googleapis.com/tasks/v1/lists/${selectedTaskList}/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: newTaskTitle,
          notes: newTaskNotes || "Из созерцательного поля"
        })
      });

      if (!res.ok) throw new Error("Task creation failed");
      onTriggerRipple();
      setNewTaskTitle("");
      setNewTaskNotes("");
      await fetchTasksForList(selectedTaskList);
    } catch (err) {
      console.error(err);
      setErrorMsg("Ошибка при посадке новой задачи.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const toggleTaskStatus = async (task: GoogleTask) => {
    // Confirm status mutation
    const newStatus = task.status === "completed" ? "needsAction" : "completed";
    const actionLabel = newStatus === "completed" ? "завершить" : "восстановить";
    const confirmed = window.confirm(`Вы уверены, что хотите ${actionLabel} задачу "${task.title}"?`);
    if (!confirmed) return;

    setIsActionLoading(true);
    try {
      const res = await fetch(`https://www.googleapis.com/tasks/v1/lists/${selectedTaskList}/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: task.id,
          status: newStatus
        })
      });

      if (!res.ok) throw new Error("Task update failed");
      onTriggerRipple();
      await fetchTasksForList(selectedTaskList);
    } catch (err) {
      console.error(err);
      setErrorMsg("Ошибка при изменении статуса стебля-задачи.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // ==================== GOOGLE DRIVE API & KEEP SYNC ====================
  const fetchDriveFiles = async () => {
    const url = "https://www.googleapis.com/drive/v3/files?pageSize=10&fields=files(id,name,mimeType,createdTime,size)&orderBy=createdTime%20desc";
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Drive list failed");
    const data = await res.json();
    setDriveFiles(data.files || []);
  };

  // Export Contemplative Journal Visions to a Text File in Drive
  const exportJournalToDrive = async () => {
    const confirmed = window.confirm("Выгрузить все текущие мысли из Дневника Поля в виде отдельного текстового свитка на Google Диск?");
    if (!confirmed) return;

    setIsActionLoading(true);
    try {
      const filename = `Поле Ликования - Свиток Мыслей (${new Date().toLocaleDateString()}).txt`;
      const fileHeader = `=======================================================\n` +
                         `          СВИТОК СОЗЕРЦАНИЙ - ПОЛЕ ЛИКОВАНИЯ\n` +
                         `        Дата архивации: ${new Date().toLocaleString()}\n` +
                         `=======================================================\n\n`;
      const fileContent = fileHeader + visions.map((v, i) => {
        const chats = v.messages ? v.messages.map(m => `  [${m.role === "user" ? "Вы" : "Шёпот Поля"}]: ${m.text}`).join("\n") : `  [Шёпот Поля]: ${v.whisper}`;
        return `[Видение #${v.id.slice(-4)}] - ${new Date(v.createdAt).toLocaleString()}\n` +
               `  Мысль: "${v.text}"\n` +
               `  Гармоника цвета: ${v.color}\n` +
               `  Локация поля: X: ${v.x}%, Y: ${v.y}%\n` +
               `  Модель: ${v.modelUsed || "gemini-3.5-flash"}\n` +
               `  Диалог:\n${chats}\n` +
               `-------------------------------------------------------`;
      }).join("\n\n");

      await uploadFileToDrive(filename, "text/plain", fileContent);
      onTriggerRipple();
      alert(`Свиток успешно создан на Google Диске как "${filename}"!`);
      await fetchDriveFiles();
    } catch (err) {
      console.error(err);
      setErrorMsg("Ошибка экспорта дневника на Google Диск.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const uploadFileToDrive = async (name: string, mimeType: string, content: string) => {
    const boundary = "foo_bar_boundary";
    const metadata = { name, mimeType };

    const body = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(metadata),
      `--${boundary}`,
      `Content-Type: ${mimeType}`,
      "",
      content,
      `--${boundary}--`
    ].join("\r\n");

    const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body
    });

    if (!res.ok) throw new Error("Multipart Drive upload failed");
    return await res.json();
  };

  // ==================== GOOGLE KEEP SYNCED VIA DRIVE ====================
  // We save Keep notes as 'contemplative_keep_notes.json' in Google Drive
  const fetchKeepNotes = async () => {
    // Find if file exists
    const queryUrl = `https://www.googleapis.com/drive/v3/files?q=name='contemplative_keep_notes.json' and trashed=false&fields=files(id,name)`;
    const res = await fetch(queryUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Querying Keep backup file failed");
    const queryData = await res.json();

    if (queryData.files && queryData.files.length > 0) {
      const fileId = queryData.files[0].id;
      setKeepFileId(fileId);

      // Download content
      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      const downRes = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (downRes.ok) {
        try {
          const notes = await downRes.json();
          setKeepNotes(notes || []);
        } catch (e) {
          console.error("Corrupted Keep file, starting clean", e);
          setKeepNotes([]);
        }
      }
    } else {
      // First-time setup, populate with default notes
      const defaults: KeepNote[] = [
        {
          id: "keep-1",
          title: "Заметка Ветра",
          content: "Ветры качают ковыль по ночам. Здесь тепло, когда мысли сияют в унисон.",
          color: KEEP_COLORS[0].value,
          createdAt: new Date().toISOString()
        }
      ];
      setKeepNotes(defaults);
      // Let's write the file asynchronously
      await saveKeepNotesToDrive(defaults, null);
    }
  };

  const saveKeepNotesToDrive = async (notesList: KeepNote[], existingId: string | null) => {
    const boundary = "foo_bar_boundary";
    const metadata = {
      name: "contemplative_keep_notes.json",
      mimeType: "application/json"
    };
    const content = JSON.stringify(notesList, null, 2);

    const body = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(metadata),
      `--${boundary}`,
      "Content-Type: application/json",
      "",
      content,
      `--${boundary}--`
    ].join("\r\n");

    let url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    let method = "POST";

    if (existingId) {
      // Update existing file
      url = `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`;
      method = "PATCH";
    }

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body
    });

    if (res.ok) {
      const data = await res.json();
      if (data.id) {
        setKeepFileId(data.id);
      }
    } else {
      throw new Error("Failed to save Keep notes back to Google Drive");
    }
  };

  const createKeepNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle || !newNoteContent) return;

    setIsActionLoading(true);
    const newNote: KeepNote = {
      id: "keep-" + Date.now(),
      title: newNoteTitle,
      content: newNoteContent,
      color: newNoteColor,
      createdAt: new Date().toISOString()
    };

    const updated = [newNote, ...keepNotes];
    try {
      await saveKeepNotesToDrive(updated, keepFileId);
      setKeepNotes(updated);
      onTriggerRipple();
      setNewNoteTitle("");
      setNewNoteContent("");
    } catch (err) {
      console.error(err);
      setErrorMsg("Ошибка синхронизации заметок Keep в Google Drive.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const deleteKeepNote = async (id: string) => {
    const confirmed = window.confirm("Удалить этот свиток-заметку навсегда?");
    if (!confirmed) return;

    setIsActionLoading(true);
    const updated = keepNotes.filter(n => n.id !== id);
    try {
      await saveKeepNotesToDrive(updated, keepFileId);
      setKeepNotes(updated);
      onTriggerRipple();
    } catch (err) {
      console.error(err);
      setErrorMsg("Ошибка при удалении заметки с Диска.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div
      className="rounded-3xl p-6 sm:p-8 border backdrop-blur-2xl transition-all duration-500 space-y-6"
      style={{
        backgroundColor: activeTheme.cardBg,
        borderColor: activeTheme.accentColor + "20"
      }}
      id="workspace-portal-container"
    >
      {/* Portal Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-lg font-serif italic text-white/95">
              Эфирные Сферы Google Workspace
            </h2>
          </div>
          <p className="text-xs text-white/50 font-sans max-w-lg">
            Вплетайте ритмы своей реальной почты, календаря и диска в спокойное синестетическое поле созерцания.
          </p>
        </div>

        {!needsAuth && user && (
          <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-2xl border border-white/5 text-[11px] font-mono">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
              <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex flex-col max-w-[150px] sm:max-w-none text-left">
              <span className="font-semibold text-white/80 line-clamp-1">{user.displayName || "Исследователь"}</span>
              <span className="text-[9px] text-white/35 line-clamp-1">{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-white/5 rounded-lg text-white/40 hover:text-rose-400 cursor-pointer transition-all ml-1"
              title="Выйти из Сферы"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs font-mono animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Not Logged In State */}
      {needsAuth ? (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center animate-pulse">
            <HardDrive className="w-8 h-8 text-white/40" />
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="text-sm font-mono tracking-widest uppercase text-white/85">
              Подключение к Космосу Google
            </h3>
            <p className="text-xs text-white/50 leading-relaxed font-sans">
              Вам потребуется войти в свой аккаунт Google, чтобы дать приложению временные безопасные права на просмотр вашего Календаря, Почты, Задач и Файлов. Токены хранятся строго в памяти браузера.
            </p>
          </div>

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="gsi-material-button hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-xl shadow-black/40 cursor-pointer"
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents font-sans font-medium text-[13px] text-gray-800">
                {isLoggingIn ? "Инициализация связи..." : "Войти через Google Workspace"}
              </span>
            </div>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Tabs Navigation */}
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 border-b md:border-b-0 md:border-r border-white/5 pr-0 md:pr-4">
            <button
              onClick={() => setActiveTab("calendar")}
              className={`flex items-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-mono tracking-wider transition-all cursor-pointer whitespace-nowrap md:w-full text-left ${
                activeTab === "calendar"
                  ? "bg-white/10 text-emerald-300 font-medium border-l-2 border-emerald-400 pl-3"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Зеркала Календаря</span>
            </button>
            <button
              onClick={() => setActiveTab("gmail")}
              className={`flex items-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-mono tracking-wider transition-all cursor-pointer whitespace-nowrap md:w-full text-left ${
                activeTab === "gmail"
                  ? "bg-white/10 text-rose-300 font-medium border-l-2 border-rose-400 pl-3"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              <Mail className="w-4 h-4 text-rose-400" />
              <span>Шёпот Gmail</span>
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`flex items-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-mono tracking-wider transition-all cursor-pointer whitespace-nowrap md:w-full text-left ${
                activeTab === "tasks"
                  ? "bg-white/10 text-amber-300 font-medium border-l-2 border-amber-400 pl-3"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              <CheckSquare className="w-4 h-4 text-amber-400" />
              <span>Стебли Tasks</span>
            </button>
            <button
              onClick={() => setActiveTab("drive")}
              className={`flex items-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-mono tracking-wider transition-all cursor-pointer whitespace-nowrap md:w-full text-left ${
                activeTab === "drive"
                  ? "bg-white/10 text-purple-300 font-medium border-l-2 border-purple-400 pl-3"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              <HardDrive className="w-4 h-4 text-purple-400" />
              <span>Хранилище Drive</span>
            </button>
            <button
              onClick={() => setActiveTab("keep")}
              className={`flex items-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-mono tracking-wider transition-all cursor-pointer whitespace-nowrap md:w-full text-left ${
                activeTab === "keep"
                  ? "bg-white/10 text-blue-300 font-medium border-l-2 border-blue-400 pl-3"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Архивы Keep (Диск)</span>
            </button>
          </div>

          {/* Active Tab View */}
          <div className="md:col-span-3 space-y-6">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
                <span className="w-6 h-6 border-2 border-white/20 border-t-emerald-400 rounded-full animate-spin" />
                <p className="text-[10px] font-mono tracking-widest uppercase opacity-40">
                  Соединение с эфиром...
                </p>
              </div>
            ) : (
              <div className="animate-fade-in space-y-6">
                {/* 1. CALENDAR VIEW */}
                {activeTab === "calendar" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-mono tracking-widest uppercase text-emerald-300">
                        Ближайшие Ритмы Событий
                      </h3>
                      <button
                        onClick={fetchCalendarEvents}
                        className="p-1 text-white/40 hover:text-white cursor-pointer"
                        title="Обновить календарь"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                      {/* Event creation form */}
                      <form onSubmit={createCalendarEvent} className="lg:col-span-2 space-y-3.5 bg-black/25 p-4 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-mono tracking-widest uppercase text-white/50">Записать созерцание</p>
                        <input
                          type="text"
                          required
                          value={newEvTitle}
                          onChange={(e) => setNewEvTitle(e.target.value)}
                          placeholder="Название (например, Час тишины)"
                          className="w-full bg-black/45 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-serif text-white focus:outline-none focus:border-emerald-500/30 placeholder:opacity-35"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            required
                            value={newEvDate}
                            onChange={(e) => setNewEvDate(e.target.value)}
                            className="bg-black/45 border border-white/10 rounded-xl px-2 py-1.5 text-xs font-mono text-white focus:outline-none"
                          />
                          <input
                            type="time"
                            required
                            value={newEvTime}
                            onChange={(e) => setNewEvTime(e.target.value)}
                            className="bg-black/45 border border-white/10 rounded-xl px-2 py-1.5 text-xs font-mono text-white focus:outline-none"
                          />
                        </div>
                        <textarea
                          value={newEvDesc}
                          onChange={(e) => setNewEvDesc(e.target.value)}
                          placeholder="Описание или мысль..."
                          rows={2}
                          className="w-full bg-black/45 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-sans text-white focus:outline-none focus:border-emerald-500/30 placeholder:opacity-35 resize-none"
                        />
                        <button
                          type="submit"
                          disabled={isActionLoading}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-black text-[11px] font-mono tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Записать в Календарь</span>
                        </button>
                      </form>

                      {/* Events List */}
                      <div className="lg:col-span-3 space-y-3">
                        {events.length === 0 ? (
                          <div className="py-10 text-center rounded-2xl border border-dashed border-white/5 text-white/40 italic text-xs font-serif">
                            Нет запланированных событий в ближайшее время.
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                            {events.map((ev) => {
                              const dateText = ev.start?.dateTime
                                ? new Date(ev.start.dateTime).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
                                : ev.start?.date || "Всегда";
                              return (
                                <div
                                  key={ev.id}
                                  className="p-3 bg-black/15 hover:bg-black/25 rounded-xl border border-emerald-500/10 flex items-start gap-3 transition-all"
                                >
                                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-0.5">
                                    <Clock className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="space-y-0.5 text-left">
                                    <h4 className="text-xs font-sans font-medium text-white/90">{ev.summary}</h4>
                                    <p className="text-[10px] font-mono text-emerald-400/80">{dateText}</p>
                                    {ev.description && (
                                      <p className="text-[10px] font-sans text-white/40 line-clamp-1 italic">{ev.description}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. GMAIL VIEW */}
                {activeTab === "gmail" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-mono tracking-widest uppercase text-rose-300">
                        Письма, принесенные Ветром
                      </h3>
                      <button
                        onClick={fetchEmails}
                        className="p-1 text-white/40 hover:text-white cursor-pointer"
                        title="Проверить почту"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                      {/* Send email form */}
                      <form onSubmit={sendEmail} className="lg:col-span-2 space-y-3.5 bg-black/25 p-4 rounded-2xl border border-white/5 text-left">
                        <p className="text-[10px] font-mono tracking-widest uppercase text-white/50">Отправить Весть по Gmail</p>
                        <input
                          type="email"
                          required
                          value={mailTo}
                          onChange={(e) => setMailTo(e.target.value)}
                          placeholder="Адрес получателя"
                          className="w-full bg-black/45 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-rose-500/30 placeholder:opacity-35"
                        />
                        <input
                          type="text"
                          required
                          value={mailSubj}
                          onChange={(e) => setMailSubj(e.target.value)}
                          placeholder="Тема весточки"
                          className="w-full bg-black/45 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-serif text-white focus:outline-none focus:border-rose-500/30 placeholder:opacity-35"
                        />
                        <textarea
                          required
                          value={mailBody}
                          onChange={(e) => setMailBody(e.target.value)}
                          placeholder="Текст письма..."
                          rows={3}
                          className="w-full bg-black/45 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-sans text-white focus:outline-none focus:border-rose-500/30 placeholder:opacity-35 resize-none"
                        />
                        <button
                          type="submit"
                          disabled={isActionLoading}
                          className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-black text-[11px] font-mono tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Пустить по ветру</span>
                        </button>
                      </form>

                      {/* Inbox list */}
                      <div className="lg:col-span-3 space-y-3">
                        {emails.length === 0 ? (
                          <div className="py-10 text-center rounded-2xl border border-dashed border-white/5 text-white/40 italic text-xs font-serif">
                            Никаких писем не найдено во Входящих.
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                            {emails.map((m) => (
                              <div
                                key={m.id}
                                className="p-3.5 bg-black/15 hover:bg-black/25 rounded-xl border border-rose-500/10 text-left space-y-1.5 transition-all"
                              >
                                <div className="flex justify-between items-center text-[9px] font-mono">
                                  <span className="text-rose-400 line-clamp-1">{m.from}</span>
                                  <span className="opacity-30">{m.date}</span>
                                </div>
                                <h4 className="text-xs font-sans font-medium text-white/95">{m.subject}</h4>
                                <p className="text-[11px] font-serif italic text-white/55 line-clamp-2">{m.snippet}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. TASKS VIEW */}
                {activeTab === "tasks" && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xs font-mono tracking-widest uppercase text-amber-300">
                          Стебли Земных Дел
                        </h3>
                        {taskLists.length > 0 && (
                          <select
                            value={selectedTaskList}
                            onChange={handleTaskListChange}
                            className="bg-black/45 border border-white/10 rounded-xl px-2.5 py-1 text-[11px] font-mono text-amber-300 focus:outline-none cursor-pointer"
                          >
                            {taskLists.map((l) => (
                              <option key={l.id} value={l.id} className="bg-[#0f172a] text-white">
                                {l.title}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <button
                        onClick={() => selectedTaskList && fetchTasksForList(selectedTaskList)}
                        className="p-1 text-white/40 hover:text-white cursor-pointer self-end sm:self-auto"
                        title="Обновить задачи"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                      {/* Task form */}
                      <form onSubmit={createTask} className="lg:col-span-2 space-y-3.5 bg-black/25 p-4 rounded-2xl border border-white/5 text-left">
                        <p className="text-[10px] font-mono tracking-widest uppercase text-white/50">Посадить дело-стебель</p>
                        <input
                          type="text"
                          required
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          placeholder="Суть дела"
                          className="w-full bg-black/45 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-sans text-white focus:outline-none focus:border-amber-500/30 placeholder:opacity-35"
                        />
                        <textarea
                          value={newTaskNotes}
                          onChange={(e) => setNewTaskNotes(e.target.value)}
                          placeholder="Заметки или детали..."
                          rows={2}
                          className="w-full bg-black/45 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-sans text-white focus:outline-none focus:border-amber-500/30 placeholder:opacity-35 resize-none"
                        />
                        <button
                          type="submit"
                          disabled={isActionLoading}
                          className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-black text-[11px] font-mono tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Посадить в землю</span>
                        </button>
                      </form>

                      {/* Tasks List */}
                      <div className="lg:col-span-3 space-y-3">
                        {tasks.length === 0 ? (
                          <div className="py-10 text-center rounded-2xl border border-dashed border-white/5 text-white/40 italic text-xs font-serif">
                            Все дела завершены. Пустота и свобода.
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                            {tasks.map((t) => {
                              const isCompleted = t.status === "completed";
                              return (
                                <div
                                  key={t.id}
                                  onClick={() => toggleTaskStatus(t)}
                                  className={`p-3 bg-black/15 hover:bg-black/25 rounded-xl border flex items-start gap-3 transition-all cursor-pointer text-left ${
                                    isCompleted ? "opacity-35 border-white/5 line-through" : "border-amber-500/10"
                                  }`}
                                >
                                  <div className={`p-1 rounded-md border flex-shrink-0 mt-0.5 transition-all ${
                                    isCompleted
                                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                      : "bg-black/30 border-white/15 text-white/30"
                                  }`}>
                                    {isCompleted ? <Check className="w-3 h-3" /> : <div className="w-3 h-3" />}
                                  </div>
                                  <div className="space-y-0.5">
                                    <h4 className="text-xs font-sans font-medium text-white/90">{t.title}</h4>
                                    {t.notes && (
                                      <p className="text-[10px] font-mono text-white/40">{t.notes}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. DRIVE VIEW */}
                {activeTab === "drive" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-mono tracking-widest uppercase text-purple-300">
                        Хранилище Туч Google Drive
                      </h3>
                      <button
                        onClick={fetchDriveFiles}
                        className="p-1 text-white/40 hover:text-white cursor-pointer"
                        title="Обновить файлы"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                      {/* Sync/Export Controls */}
                      <div className="lg:col-span-2 space-y-4 text-left">
                        <div className="bg-black/25 p-4 rounded-2xl border border-white/5 space-y-3.5">
                          <p className="text-[10px] font-mono tracking-widest uppercase text-white/50">Архивация в Облако</p>
                          <p className="text-xs text-white/60 leading-relaxed font-sans">
                            Вы можете мгновенно экспортировать весь текущий "Дневник Полевых Шёпотов" как целостный структурированный свиток (файл .txt) на ваш Google Диск.
                          </p>
                          <button
                            onClick={exportJournalToDrive}
                            disabled={visions.length === 0 || isActionLoading}
                            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-20 text-black text-[11px] font-mono tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
                          >
                            <HardDriveUpload className="w-4 h-4" />
                            <span>Создать Свиток (.txt)</span>
                          </button>
                        </div>
                      </div>

                      {/* Drive Files List */}
                      <div className="lg:col-span-3 space-y-3">
                        <p className="text-[10px] font-mono opacity-40 text-left uppercase tracking-widest">Последние документы</p>
                        {driveFiles.length === 0 ? (
                          <div className="py-10 text-center rounded-2xl border border-dashed border-white/5 text-white/40 italic text-xs font-serif">
                            Диск пуст или файлы скрыты.
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                            {driveFiles.map((f) => (
                              <div
                                key={f.id}
                                className="p-3 bg-black/15 hover:bg-black/25 rounded-xl border border-purple-500/10 flex items-center justify-between text-left transition-all"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                    <FolderOpen className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="space-y-0.5">
                                    <h4 className="text-xs font-sans font-medium text-white/90 truncate max-w-[180px] sm:max-w-xs">{f.name}</h4>
                                    <p className="text-[9px] font-mono text-purple-400/80">{f.mimeType.split(".").pop()}</p>
                                  </div>
                                </div>
                                <span className="text-[9px] font-mono opacity-30">{new Date(f.createdTime).toLocaleDateString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. KEEP NOTES VIEW */}
                {activeTab === "keep" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-mono tracking-widest uppercase text-blue-300">
                        Свитки Заметок Keep (Синхронизация через Drive)
                      </h3>
                      <button
                        onClick={fetchKeepNotes}
                        className="p-1 text-white/40 hover:text-white cursor-pointer"
                        title="Синхронизировать с Диском"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                      {/* Notes Form */}
                      <form onSubmit={createKeepNote} className="lg:col-span-2 space-y-3.5 bg-black/25 p-4 rounded-2xl border border-white/5 text-left">
                        <p className="text-[10px] font-mono tracking-widest uppercase text-white/50">Новый Свиток</p>
                        <input
                          type="text"
                          required
                          value={newNoteTitle}
                          onChange={(e) => setNewNoteTitle(e.target.value)}
                          placeholder="Заголовок заметки"
                          className="w-full bg-black/45 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-serif text-white focus:outline-none focus:border-blue-500/30 placeholder:opacity-35"
                        />
                        <textarea
                          required
                          value={newNoteContent}
                          onChange={(e) => setNewNoteContent(e.target.value)}
                          placeholder="Содержание..."
                          rows={3}
                          className="w-full bg-black/45 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-sans text-white focus:outline-none focus:border-blue-500/30 placeholder:opacity-35 resize-none"
                        />

                        {/* Color Selection */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono opacity-50 uppercase">Гармоника цвета</label>
                          <div className="flex gap-1.5">
                            {KEEP_COLORS.map((c) => (
                              <button
                                key={c.name}
                                type="button"
                                onClick={() => setNewNoteColor(c.value)}
                                className={`w-5 h-5 rounded-full transition-all border cursor-pointer ${
                                  newNoteColor === c.value ? "scale-110 border-white" : "border-transparent"
                                }`}
                                style={{ backgroundColor: c.value }}
                                title={c.name}
                              />
                            ))}
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isActionLoading}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-black text-[11px] font-mono tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Создать и загрузить</span>
                        </button>
                      </form>

                      {/* Notes List */}
                      <div className="lg:col-span-3 space-y-3">
                        {keepNotes.length === 0 ? (
                          <div className="py-10 text-center rounded-2xl border border-dashed border-white/5 text-white/40 italic text-xs font-serif">
                            Никаких свитков заметок еще не записано.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1">
                            {keepNotes.map((n) => (
                              <div
                                key={n.id}
                                className="p-4 rounded-xl border text-left flex flex-col justify-between space-y-3 transition-all relative group"
                                style={{
                                  backgroundColor: n.color || "rgba(255,255,255,0.05)",
                                  borderColor: "rgba(255, 255, 255, 0.08)"
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => deleteKeepNote(n.id)}
                                  className="absolute right-2 top-2 p-1.5 bg-black/30 hover:bg-rose-500/20 text-white/30 hover:text-rose-400 rounded-lg cursor-pointer transition-all opacity-0 group-hover:opacity-100"
                                  title="Уничтожить свиток"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                                <div className="space-y-1">
                                  <h4 className="text-xs font-serif font-bold text-white pr-4">{n.title}</h4>
                                  <p className="text-[11px] font-sans text-white/70 leading-relaxed break-words">{n.content}</p>
                                </div>
                                <span className="text-[8px] font-mono opacity-30 self-end">
                                  {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
