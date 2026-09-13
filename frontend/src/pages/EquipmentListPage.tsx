import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import type { Equipment, EquipmentCategory, EquipmentInput } from "../types";

const emptyForm: EquipmentInput = {
  name: "",
  category: "server",
  model: "",
  location: "",
  ip_address: "",
  owner: "",
  purchase_date: null,
  warranty_end: null,
  status: "active",
};

const CATEGORY_LABEL: Record<EquipmentCategory, string> = {
  server: "서버",
  security: "보안장비",
  network: "네트워크장비",
};

export default function EquipmentListPage() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [form, setForm] = useState<EquipmentInput>(emptyForm);
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

  useEffect(load, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createEquipment({
        ...form,
        model: form.model || null,
        location: form.location || null,
        ip_address: form.ip_address || null,
        owner: form.owner || null,
      });
      setForm(emptyForm);
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

  return (
    <div>
      <h2>장비 등록</h2>
      <form className="inline" onSubmit={handleSubmit}>
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
          placeholder="담당자"
          value={form.owner ?? ""}
          onChange={(e) => setForm({ ...form, owner: e.target.value })}
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
              <th>이름</th>
              <th>분류</th>
              <th>모델</th>
              <th>위치</th>
              <th>담당자</th>
              <th>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link to={`/equipments/${item.id}`}>{item.name}</Link>
                </td>
                <td>{CATEGORY_LABEL[item.category]}</td>
                <td>{item.model}</td>
                <td>{item.location}</td>
                <td>{item.owner}</td>
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
