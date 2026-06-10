"use client";

import { FormEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { signOut } from "next-auth/react";
import ExternalConnectionsPanel from "./ExternalConnectionsPanel";
import type { UserStorageUsage } from "../lib/userStorageUsage";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const decimals = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

type AdminUser = {
  name?: string | null;
  email?: string | null;
  hasPassword: boolean;
  isAdmin: boolean;
};

type PanelProps = {
  user: AdminUser;
  storageUsage: UserStorageUsage;
};

const sections = [
  { id: "conta", label: "Conta" },
  { id: "seguranca", label: "Seguranca" },
  { id: "dados", label: "Dados" },
  { id: "plano", label: "Plano" },
  { id: "nemosine", label: "Nemosine" },
] as const;

export default function AccountAdministrationPanel({ user, storageUsage }: PanelProps) {
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]["id"]>("conta");
  const [displayName, setDisplayName] = useState(user.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  const usedStorageLabel = useMemo(() => formatBytes(storageUsage.usedBytes), [storageUsage.usedBytes]);
  const quotaStorageLabel = useMemo(() => formatBytes(storageUsage.quotaBytes), [storageUsage.quotaBytes]);

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileBusy(true);
    setProfileMessage("");

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: displayName }),
      });
      const data = await response.json();
      setProfileMessage(data.message || (response.ok ? "Perfil atualizado." : "Nao foi possivel atualizar."));
    } catch {
      setProfileMessage("Nao foi possivel atualizar o perfil agora.");
    } finally {
      setProfileBusy(false);
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage("");

    if (newPassword !== confirmPassword) {
      setPasswordMessage("A confirmacao nao coincide com a nova senha.");
      return;
    }

    setPasswordBusy(true);
    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      setPasswordMessage(data.message || (response.ok ? "Senha atualizada." : "Nao foi possivel atualizar."));
      if (response.ok) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPasswordMessage("Nao foi possivel alterar a senha agora.");
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded border border-[#c5a059]/15 bg-black/30 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#c5a059]/65">
              Area privada
            </p>
            <h2 className="mt-3 font-serif text-2xl text-white/90">
              Bem-vindo, {displayName || user.email || "peregrino"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              Gerencie acesso, dados, plano e preferencias administrativas da sua conta Nemosine.
            </p>
          </div>
          <div className="rounded border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            Conectado via {user.email}
          </div>
        </div>
      </section>

      <nav className="grid grid-cols-2 gap-2 rounded border border-[#c5a059]/15 bg-black/25 p-2 sm:grid-cols-5">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveSection(section.id)}
            className={`rounded px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors ${
              activeSection === section.id
                ? "bg-[#c5a059] text-black"
                : "text-[#c5a059]/70 hover:bg-[#c5a059]/10 hover:text-[#f3dfb4]"
            }`}
          >
            {section.label}
          </button>
        ))}
      </nav>

      {activeSection === "conta" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <PanelCard title="Perfil" kicker="Conta">
            <form onSubmit={updateProfile} className="space-y-4">
              <AccountInput label="Nome de exibicao" value={displayName} onChange={setDisplayName} />
              <AccountReadOnly label="E-mail" value={user.email || "Nao informado"} />
              <button type="submit" disabled={profileBusy} className="account-action-button">
                {profileBusy ? "Salvando..." : "Salvar perfil"}
              </button>
              {profileMessage && <PanelMessage>{profileMessage}</PanelMessage>}
            </form>
          </PanelCard>

          <PanelCard title="Acesso" kicker="Senha">
            <form onSubmit={updatePassword} className="space-y-4">
              {user.hasPassword && (
                <AccountInput
                  label="Senha atual"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  type="password"
                />
              )}
              {!user.hasPassword && (
                <p className="rounded border border-sky-400/25 bg-sky-500/10 px-3 py-2 text-xs leading-5 text-sky-200">
                  Esta conta ainda nao tem senha local. Voce pode criar uma senha para entrar tambem por e-mail.
                </p>
              )}
              <AccountInput label="Nova senha" value={newPassword} onChange={setNewPassword} type="password" />
              <AccountInput
                label="Confirmar nova senha"
                value={confirmPassword}
                onChange={setConfirmPassword}
                type="password"
              />
              <button type="submit" disabled={passwordBusy} className="account-action-button">
                {passwordBusy ? "Atualizando..." : user.hasPassword ? "Trocar senha" : "Criar senha"}
              </button>
              {passwordMessage && <PanelMessage>{passwordMessage}</PanelMessage>}
            </form>
          </PanelCard>
        </div>
      )}

      {activeSection === "seguranca" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <PanelCard title="Sessao atual" kicker="Seguranca">
            <div className="space-y-3">
              <AccountReadOnly label="Status" value="Sessao autenticada" />
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/access" })}
                className="account-secondary-button"
              >
                Sair desta conta
              </button>
            </div>
          </PanelCard>
          <ToolList
            title="Ferramentas em construcao"
            items={[
              "Autenticacao em dois fatores",
              "Dispositivos conectados",
              "Sair de todos os dispositivos",
              "Historico de login",
            ]}
            isAdmin={user.isAdmin}
          />
        </div>
      )}

      {activeSection === "dados" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <PanelCard title="Memoria e armazenamento" kicker="Dados">
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-xs text-white/55">
                  <span>{usedStorageLabel} usados</span>
                  <span>{quotaStorageLabel} cota</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full border border-[#c5a059]/15 bg-black/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2dd4bf] via-[#c5a059] to-[#f97316]"
                    style={{ width: `${storageUsage.usedPercent}%` }}
                  />
                </div>
              </div>
              <AccountReadOnly label="Plano de memoria" value={storageUsage.quotaLabel} />
            </div>
          </PanelCard>
          <ToolList
            title="Portabilidade e manutencao"
            items={[
              "Exportar meus dados",
              "Baixar registros e historico",
              "Gerenciar backups",
              "Resetar conta sem excluir login",
              "Excluir conta definitivamente",
            ]}
            isAdmin={user.isAdmin}
            danger
          />
        </div>
      )}

      {activeSection === "plano" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <PanelCard title="Plano atual" kicker="Assinatura">
            <div className="space-y-4">
              <AccountReadOnly label="Plano" value="Padrao" />
              <AccountReadOnly label="Memoria" value={`${quotaStorageLabel} disponiveis`} />
              <AccountReadOnly label="Cobranca" value="Nao configurada" />
            </div>
          </PanelCard>
          <ToolList
            title="Comercial"
            items={["Alterar plano", "Historico de cobrancas", "Notas fiscais", "Metodo de pagamento"]}
            isAdmin={user.isAdmin}
          />
        </div>
      )}

      {activeSection === "nemosine" && (
        <div className="space-y-5">
          <ToolList
            title="Administracao simbolica"
            items={[
              "Nivel atual e criterios de progressao",
              "Relicario e preferencias de reliquia",
              "Personas favoritas",
              "Modo de privacidade do Confessor",
              "Fontes e documentos carregados",
              "Resetar progresso simbolico",
            ]}
            isAdmin={user.isAdmin}
          />
          <ExternalConnectionsPanel variant="space" />
        </div>
      )}
    </div>
  );
}

function PanelCard({ title, kicker, children }: { title: string; kicker: string; children: ReactNode }) {
  return (
    <section className="rounded border border-[#c5a059]/15 bg-black/30 p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c5a059]/60">{kicker}</p>
      <h3 className="mt-2 font-serif text-xl text-[#e7d4aa]">{title}</h3>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function AccountInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded border border-[#c5a059]/20 bg-black/40 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#c5a059]/70"
      />
    </label>
  );
}

function AccountReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#c5a059]/10 bg-black/25 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/38">{label}</p>
      <p className="mt-1 text-sm text-emerald-200">{value}</p>
    </div>
  );
}

function PanelMessage({ children }: { children: ReactNode }) {
  return (
    <p className="rounded border border-[#c5a059]/20 bg-[#c5a059]/10 px-3 py-2 text-xs leading-5 text-[#f3dfb4]">
      {children}
    </p>
  );
}

function ToolList({
  title,
  items,
  isAdmin,
  danger = false,
}: {
  title: string;
  items: string[];
  isAdmin: boolean;
  danger?: boolean;
}) {
  if (!isAdmin) return null;

  return (
    <section className="rounded border border-sky-400/20 bg-sky-500/10 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200/70">Em construcao</p>
          <h3 className="mt-2 font-serif text-xl text-sky-100">{title}</h3>
        </div>
        <span className="rounded-full border border-sky-300/30 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-sky-200">
          dev-only
        </span>
      </div>
      <div className="grid gap-2">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            disabled
            className={`flex items-center justify-between rounded border px-3 py-3 text-left text-xs uppercase tracking-[0.12em] ${
              danger
                ? "border-red-300/20 bg-red-500/10 text-red-100/80"
                : "border-sky-300/16 bg-black/20 text-sky-100/80"
            }`}
          >
            <span>{item}</span>
            <span className="material-icons text-sm">construction</span>
          </button>
        ))}
      </div>
    </section>
  );
}
