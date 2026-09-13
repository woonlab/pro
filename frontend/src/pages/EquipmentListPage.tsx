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

export default function EquipmentListPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Equipment[]>([]);
  const [codes, setCodes] = useState<Code[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<EquipmentInput>(emptyForm);
  const [serialNo, setSerialNo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div>
      <h2>장비 등록</h2>
      <form className="inline" onSubmit={handleSubmit}>
        <input
          placeholder="연번"
          value={serialNo}
          onChange={(e) => setSerialNo(e.target.value)}
        />
        <input
          placeholder="장비명"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value as EquipmentCategory })}
        >
          <option value="server">서버</option>
          <option value="security">보안장비</option>
          <option value="network">네트워크장비</option>
        </select>
        <input
          placeholder="모델명"
          value={form.model ?? ""}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
        />
        <input
          placeholder="위치"
          value={form.location ?? ""}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
        <input
          placeholder="IP 주소"
          value={form.ip_address ?? ""}
          onChange={(e) => setForm({ ...form, ip_address: e.target.value })}
        />
        <input
          type="date"
          title="도입년월"
          value={form.purchase_date ?? ""}
          onChange={(e) => setForm({ ...form, purchase_date: e.target.value || null })}
        />

        <CodeSelect
          codes={codes}
          rootName="소속기관"
          value={form.org_code_id}
          onChange={(id) => setForm({ ...form, org_code_id: id })}
        />
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
        <CodeSelect
          codes={codes}
          rootName="대분류"
          value={form.major_category_code_id}
          onChange={(id) => setForm({ ...form, major_category_code_id: id })}
        />
        <CodeSelect
          codes={codes}
          rootName="업무"
          value={form.business_code_id}
          onChange={(id) => setForm({ ...form, business_code_id: id })}
        />
        <select
          value={form.hw_sw ?? ""}
          onChange={(e) => setForm({ ...form, hw_sw: (e.target.value || null) as "HW" | "SW" | null })}
        >
          <option value="">구분 선택</option>
          <option value="HW">HW</option>
          <option value="SW">SW</option>
        </select>
        <CodeSelect
          codes={codes}
          rootName="제품구분"
          value={form.product_type_code_id}
          onChange={(id) => setForm({ ...form, product_type_code_id: id })}
        />
        <CodeSelect
          codes={codes}
          rootName="제조사"
          value={form.manufacturer_code_id}
          onChange={(id) => setForm({ ...form, manufacturer_code_id: id })}
        />
        <select
          value={form.maintenance_target ?? ""}
          onChange={(e) =>
            setForm({ ...form, maintenance_target: (e.target.value || null) as "free" | "paid" | null })
          }
        >
          <option value="">유지보수 대상여부</option>
          <option value="free">무상</option>
          <option value="paid">유상</option>
        </select>

        <input
          type="number"
          placeholder="수량"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
        />
        <input
          type="number"
          placeholder="단가"
          value={form.unit_price}
          onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })}
        />
        {user?.is_admin && (
          <input
            type="number"
            placeholder="유지관리요율(%)"
            value={form.maintenance_rate ?? 0}
            onChange={(e) => setForm({ ...form, maintenance_rate: Number(e.target.value) })}
          />
        )}
        <input
          type="number"
          placeholder="유지개월"
          value={form.maintenance_months}
          onChange={(e) => setForm({ ...form, maintenance_months: Number(e.target.value) })}
        />
        <CodeSelect
          codes={codes}
          rootName="검토결과"
          value={form.review_result_code_id}
          onChange={(id) => setForm({ ...form, review_result_code_id: id })}
        />
        <input
          placeholder="검토내용"
          value={form.review_content ?? ""}
          onChange={(e) => setForm({ ...form, review_content: e.target.value })}
        />

        <button type="submit">등록</button>
      </form>

      <h2>장비 목록</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>연번</th>
              <th>이름</th>
              <th>분류</th>
              <th>소속기관</th>
              <th>담당자</th>
              <th>취득가격</th>
              {user?.is_admin && <th>유지관리금액</th>}
              <th>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.serial_no ?? "-"}</td>
                <td>
                  <Link to={`/equipments/${item.id}`}>{item.name}</Link>
                </td>
                <td>{CATEGORY_LABEL[item.category]}</td>
                <td>{codeName(codes, item.org_code_id)}</td>
                <td>{userLabel(item.owner_user_id)}</td>
                <td>{item.acquisition_price.toLocaleString()}</td>
                {user?.is_admin && <td>{item.maintenance_amount.toLocaleString()}</td>}
                <td>{item.status}</td>
                <td>
                  <button className="secondary" onClick={() => handleDelete(item.id)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
