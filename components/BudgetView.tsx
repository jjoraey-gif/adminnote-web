'use client';

import { useState } from 'react';
import { SubProject, colorHex, comma } from '@/lib/useSnapshot';

interface Props {
  subProjects: SubProject[];
}

function spBudget(sp: SubProject) {
  return sp.pyeonsongmoks.reduce((a, pm) => a + pm.seomoks.reduce((b, s) => b + s.budgetAmount, 0), 0);
}
function spSpent(sp: SubProject) {
  return sp.pyeonsongmoks.reduce((a, pm) => a + pm.seomoks.reduce((b, s) => b + s.spentAmount, 0), 0);
}
function execRate(budget: number, spent: number) {
  return budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
}

export default function BudgetView({ subProjects }: Props) {
  const [selected, setSelected] = useState<string | null>(
    subProjects.length > 0 ? subProjects[0].id : null
  );
  const [openPm, setOpenPm] = useState<string | null>(null);

  const sorted = [...subProjects].sort((a, b) => a.sortOrder - b.sortOrder);
  const selectedSp = sorted.find(sp => sp.id === selected);

  const totalBudget = sorted.reduce((a, sp) => a + spBudget(sp), 0);
  const totalSpent = sorted.reduce((a, sp) => a + spSpent(sp), 0);

  if (subProjects.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF', fontSize: 14 }}>
        등록된 예산이 없습니다.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* 전체 요약 */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24,
      }}>
        {[
          { label: '총 예산', value: comma(Math.trunc(totalBudget / 1000)) + '천원', color: '#1C1C1E' },
          { label: '집행액', value: comma(Math.trunc(totalSpent / 1000)) + '천원', color: '#2563EB' },
          { label: '잔액', value: comma(Math.trunc((totalBudget - totalSpent) / 1000)) + '천원', color: totalBudget - totalSpent < 0 ? '#EF4444' : '#16A34A' },
        ].map(item => (
          <div key={item.label} style={{
            padding: '16px 20px', background: '#fff',
            border: '1px solid #E5E7EB', borderRadius: 14, textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* 전체 집행률 바 */}
      <div style={{ marginBottom: 24, padding: '14px 20px', background: '#F9FAFB', borderRadius: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', marginBottom: 8 }}>
          <span style={{ fontWeight: 600 }}>전체 집행률</span>
          <span style={{ fontWeight: 700, color: '#2563EB' }}>{execRate(totalBudget, totalSpent).toFixed(1)}%</span>
        </div>
        <div style={{ height: 10, background: '#E5E7EB', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${execRate(totalBudget, totalSpent)}%`,
            background: '#2563EB', borderRadius: 5, transition: 'width 0.4s',
          }} />
        </div>
      </div>

      {/* 세부사업 탭 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {sorted.map(sp => (
          <button
            key={sp.id}
            onClick={() => setSelected(sp.id)}
            style={{
              padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              border: selected === sp.id ? 'none' : '1px solid #E5E7EB',
              background: selected === sp.id ? colorHex(sp.color) : '#fff',
              color: selected === sp.id ? '#fff' : '#374151',
            }}
          >
            {sp.name}
          </button>
        ))}
      </div>

      {/* 선택된 세부사업 상세 */}
      {selectedSp && (
        <div>
          {/* 세부사업 요약 */}
          <div style={{
            padding: '14px 20px', background: '#fff',
            border: `2px solid ${colorHex(selectedSp.color)}`,
            borderRadius: 14, marginBottom: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1E' }}>{selectedSp.name}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: colorHex(selectedSp.color) }}>
                {execRate(spBudget(selectedSp), spSpent(selectedSp)).toFixed(1)}%
              </span>
            </div>
            <div style={{ height: 8, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{
                height: '100%', width: `${execRate(spBudget(selectedSp), spSpent(selectedSp))}%`,
                background: colorHex(selectedSp.color), borderRadius: 4,
              }} />
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6B7280' }}>
              <span>예산 {comma(Math.trunc(spBudget(selectedSp) / 1000))}천원</span>
              <span>집행 {comma(Math.trunc(spSpent(selectedSp) / 1000))}천원</span>
              <span style={{ color: spBudget(selectedSp) - spSpent(selectedSp) < 0 ? '#EF4444' : '#16A34A' }}>
                잔액 {comma(Math.trunc((spBudget(selectedSp) - spSpent(selectedSp)) / 1000))}천원
              </span>
            </div>
          </div>

          {/* 편성목 목록 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedSp.pyeonsongmoks.map(pm => {
              const pmBudget = pm.seomoks.reduce((a, s) => a + s.budgetAmount, 0);
              const pmSpent = pm.seomoks.reduce((a, s) => a + s.spentAmount, 0);
              const isOpen = openPm === pm.id;
              return (
                <div key={pm.id} style={{ border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
                  {/* 편성목 행 */}
                  <div
                    onClick={() => setOpenPm(isOpen ? null : pm.id)}
                    style={{
                      padding: '12px 16px', background: '#F9FAFB', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>
                        {pm.code} {pm.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>
                        {comma(Math.trunc(pmSpent / 1000))} / {comma(Math.trunc(pmBudget / 1000))}천원
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB' }}>
                        {execRate(pmBudget, pmSpent).toFixed(0)}%
                      </span>
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* 세목 목록 (펼침) */}
                  {isOpen && pm.seomoks.length > 0 && (
                    <div style={{ background: '#fff' }}>
                      {pm.seomoks.map((s, i) => (
                        <div key={s.id} style={{
                          padding: '10px 20px',
                          borderTop: '1px solid #F3F4F6',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                          <span style={{ fontSize: 13, color: '#374151' }}>{s.code} {s.name}</span>
                          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6B7280' }}>
                            <span>예산 {comma(Math.trunc(s.budgetAmount / 1000))}천원</span>
                            <span>집행 {comma(Math.trunc(s.spentAmount / 1000))}천원</span>
                            <span style={{ fontWeight: 600, color: '#2563EB' }}>
                              {execRate(s.budgetAmount, s.spentAmount).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
