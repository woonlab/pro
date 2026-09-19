import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { codeName, findRootByName } from "../lib/codeLookup";
import type { Code, Equipment, EquipmentCategory, EquipmentInput, User } from "../types";

const emptyForm: EquipmentInput = {
  name: "",
  category: "server",
  model: "",
  location: "",
  ip_address: "",
  purchase_date: null,
  warranty_end: null,
  status: "active",
  owner_user_id: null,
  org_code_id: null,
  major_category_code_id: null,
  business_code_id: null,
  product_type_code_id: null,
  manufacturer_code_id: null,
  review_result_code_id: null,
  review_content: "",
  hw_sw: null,
  maintenance_target: null,
  quantity: 1,
  unit_price: 0,
  maintenance_rate: 0,
  maintenance_months: 0,
};

const CATEGORY_LABEL: Record<EquipmentCategory, string> = {
  server: "서버",
  security: "보안장비",
  network: "네트워크장비",
};

function CodeSelect({
  codes,
  rootName,
  value,
  onChange,
}: {
  codes: Code[];
  rootName: string;
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const options = findRootByName(codes, rootName)?.children ?? [];
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">{rootName} 선택</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="eq-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function maintenanceStatus(item: Equipment): { label: string; cls: string } | null {
  if (!item.purchase_date || !item.maintenance_months) return null;
  const end = new Date(item.purchase_date);
  end.setMonth(end.getMonth() + item.maintenance_months);
  const days = (end.getTime() - Date.now()) / 86400000;
  const text = end.toISOString().slice(0, 10);
  if (days < 0) return { label: `${text} 만료`, cls: "dash-pill--danger" };
  if (days <= 90) return { label: `${text} 임박`, cls: "dash-pill--warn" };
  return { label: text, cls: "dash-pill--ok" };
}

export default function EquipmentListPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Equipment[]>([]);
  const [codes, setCodes] = useState<Code[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<EquipmentInput>(emptyForm);
  const [serialNo, setSerialNo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<EquipmentCategory | "all">("all");

  const load = () => {
    setLoading(true);
    api
      .listEquipment()
      .then(setItems)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.listCodes().then(setCodes).catch((e) => setError(String(e)));
    api.listUsers().then(setUsers).catch((e) => setError(String(e)));
  }, []);

  const submit = async (keepOpen: boolean) => {
    if (!form.name.trim()) {
      setError("장비명을 입력하세요.");
      return;
    }
    setError(null);
    try {
      await api.createEquipment({
        ...form,
        serial_no: serialNo || null,
        model: form.model || null,
        location: form.location || null,
        ip_address: form.ip_address || null,
        review_content: form.review_content || null,
      });
      setForm(emptyForm);
      setSerialNo("");
      if (!keepOpen) setModalOpen(false);
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 장비를 삭제할까요? 관련 유지보수 이력도 함께 삭제됩니다.")) return;
    await api.deleteEquipment(id);
    load();
  };

  const userLabel = (id: number | null) => {
    if (id == null) return "-";
    const u = users.find((u) => u.id === id);
    return u ? (u.full_name ?? u.username) : "-";
  };

  const counts = {
    all: items.length,
    server: items.filter((i) => i.category === "server").length,
    network: items.filter((i) => i.category === "network").length,
    security: items.filter((i) => i.category === "security").length,
  };

  const keyword = search.trim().toLowerCase();
  const filtered = items.filter((i) => {
    if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
    if (!keyword) return true;
    return [i.name, i.ip_address, i.serial_no, i.model]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(keyword));
  });

  const chips: { key: EquipmentCategory | "all"; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "server", label: "서버" },
    { key: "network", label: "네트워크" },
    { key: "security", label: "보안" },
  ];

  return (
    <div>
      <div className="eq-toolbar">
        <input
          className="eq-search"
          placeholder="장비명 / IP / 연번 / 모델 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`eq-chip${categoryFilter === c.key ? " on" : ""}`}
            onClick={() => setCategoryFilter(c.key)}
          >
            {c.label} {counts[c.key]}
          </button>
        ))}
        <button type="button" onClick={() => setModalOpen(true)}>
          + 장비 등록
        </button>
      </div>

      {error && !modalOpen && <p style={{ color: "crimson" }}>{error}</p>}
      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>연번</th>
              <th>이름</th>
              <th>분류</th>
              <th>IP</th>
              <th>소속기관</th>
              <th>담당자</th>
              <th>취득가격</th>
              {user?.is_admin && <th>유지관리금액</th>}
              <th>유지보수 만료</th>
              <th>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const ms = maintenanceStatus(item);
              return (
                <tr key={item.id}>
                  <td>{item.serial_no ?? "-"}</td>
                  <td>
                    <Link to={`/equipments/${item.id}`}>{item.name}</Link>
                  </td>
                  <td>{CATEGORY_LABEL[item.category]}</td>
                  <td>{item.ip_address ?? "-"}</td>
                  <td>{codeName(codes, item.org_code_id)}</td>
                  <td>{userLabel(item.owner_user_id)}</td>
                  <td>{item.acquisition_price.toLocaleString()}</td>
                  {user?.is_admin && <td>{item.maintenance_amount.toLocaleString()}</td>}
                  <td>{ms ? <span className={`dash-pill ${ms.cls}`}>{ms.label}</span> : "-"}</td>
                  <td>{item.status}</td>
                  <td>
                    <button className="secondary" onClick={() => handleDelete(item.id)}>
                      삭제
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {!loading && filtered.length === 0 && <p className="dash-empty">조건에 맞는 장비가 없습니다.</p>}

      {modalOpen && (
        <div className="idle-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="eq-modal" onClick={(e) => e.stopPropagation()}>
            <h3>장비 등록</h3>
            {error && <p style={{ color: "crimson", fontSize: 13 }}>{error}</p>}

            <div className="eq-grid">
              <Field label="장비명 *">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  autoFocus
                />
              </Field>
              <Field label="분류 *">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as EquipmentCategory })}
                >
                  <option value="server">서버</option>
                  <option value="security">보안장비</option>
                  <option value="network">네트워크장비</option>
                </select>
              </Field>
              <Field label="연번">
                <input value={serialNo} onChange={(e) => setSerialNo(e.target.value)} />
              </Field>
              <Field label="IP 주소">
                <input
                  value={form.ip_address ?? ""}
                  onChange={(e) => setForm({ ...form, ip_address: e.target.value })}
                />
              </Field>
            </div>

            <details className="eq-section">
              <summary>기본 상세 (모델 · 위치 · 도입년월)</summary>
              <div className="eq-grid">
                <Field label="모델명">
                  <input value={form.model ?? ""} onChange={(e) => setForm({ ...form, model: e.target.value })} />
                </Field>
                <Field label="위치">
                  <input
                    value={form.location ?? ""}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </Field>
                <Field label="도입년월">
                  <input
                    type="date"
                    value={form.purchase_date ?? ""}
                    onChange={(e) => setForm({ ...form, purchase_date: e.target.value || null })}
                  />
                </Field>
              </div>
            </details>

            <details className="eq-section">
              <summary>관리 정보 (기관 · 담당자 · 제조사 · 업무)</summary>
              <div className="eq-grid">
                <Field label="소속기관">
                  <CodeSelect
                    codes={codes}
                    rootName="소속기관"
                    value={form.org_code_id}
                    onChange={(id) => setForm({ ...form, org_code_id: id })}
                  />
                </Field>
                <Field label="담당자">
                  <select
                    value={form.owner_user_id ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, owner_user_id: e.target.value ? Number(e.target.value) : null })
                    }
                  >
                    <option value="">담당자 선택</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name ?? u.username}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="대분류">
                  <CodeSelect
                    codes={codes}
                    rootName="대분류"
                    value={form.major_category_code_id}
                    onChange={(id) => setForm({ ...form, major_category_code_id: id })}
                  />
                </Field>
                <Field label="업무">
                  <CodeSelect
                    codes={codes}
                    rootName="업무"
                    value={form.business_code_id}
                    onChange={(id) => setForm({ ...form, business_code_id: id })}
                  />
                </Field>
                <Field label="구분 (HW/SW)">
                  <select
                    value={form.hw_sw ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, hw_sw: (e.target.value || null) as "HW" | "SW" | null })
                    }
                  >
                    <option value="">선택</option>
                    <option value="HW">HW</option>
                    <option value="SW">SW</option>
                  </select>
                </Field>
                <Field label="제품구분">
                  <CodeSelect
                    codes={codes}
                    rootName="제품구분"
                    value={form.product_type_code_id}
                    onChange={(id) => setForm({ ...form, product_type_code_id: id })}
                  />
                </Field>
                <Field label="제조사">
                  <CodeSelect
                    codes={codes}
                    rootName="제조사"
                    value={form.manufacturer_code_id}
                    onChange={(id) => setForm({ ...form, manufacturer_code_id: id })}
                  />
                </Field>
              </div>
            </details>

            <details className="eq-section">
              <summary>금액 · 유지보수</summary>
              <div className="eq-grid">
                <Field label="유지보수 대상여부">
                  <select
                    value={form.maintenance_target ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        maintenance_target: (e.target.value || null) as "free" | "paid" | null,
                      })
                    }
                  >
                    <option value="">선택</option>
                    <option value="free">무상</option>
                    <option value="paid">유상</option>
                  </select>
                </Field>
                <Field label="수량">
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                  />
                </Field>
                <Field label="단가">
                  <input
                    type="number"
                    value={form.unit_price}
                    onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })}
                  />
                </Field>
                <Field label="유지개월">
                  <input
                    type="number"
                    value={form.maintenance_months}
                    onChange={(e) => setForm({ ...form, maintenance_months: Number(e.target.value) })}
                  />
                </Field>
                {user?.is_admin && (
                  <Field label="유지관리요율(%)">
                    <input
                      type="number"
                      value={form.maintenance_rate ?? 0}
                      onChange={(e) => setForm({ ...form, maintenance_rate: Number(e.target.value) })}
                    />
                  </Field>
                )}
              </div>
            </details>

            <details className="eq-section">
              <summary>검토 결과</summary>
              <div className="eq-grid">
                <Field label="검토결과">
                  <CodeSelect
                    codes={codes}
                    rootName="검토결과"
                    value={form.review_result_code_id}
                    onChange={(id) => setForm({ ...form, review_result_code_id: id })}
                  />
                </Field>
                <Field label="검토내용">
                  <input
                    value={form.review_content ?? ""}
                    onChange={(e) => setForm({ ...form, review_content: e.target.value })}
                  />
                </Field>
              </div>
            </details>

            <div className="eq-actions">
              <button type="button" className="secondary" onClick={() => setModalOpen(false)}>
                취소
              </button>
              <button type="button" className="secondary" onClick={() => submit(true)}>
                저장 후 계속 등록
              </button>
              <button type="button" onClick={() => submit(false)}>
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
