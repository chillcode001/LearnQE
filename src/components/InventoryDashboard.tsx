import { useEffect, useState } from 'react';
import {
  fetchInventoryPage,
  fetchStockMovements,
  INVENTORY_PAGE_SIZE,
  recordStockMovement,
} from '../api/inventory';
import type { InventoryItem, StockMovement } from '../types/product';

type StockStatus = 'All stock' | 'In stock' | 'Low stock' | 'Out of stock';
type ModalMode = 'receive' | 'adjust' | null;

const STOCK_STATUS_OPTIONS: StockStatus[] = [
  'All stock',
  'In stock',
  'Low stock',
  'Out of stock',
];

export function InventoryDashboard() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [totalMatchingItems, setTotalMatchingItems] = useState(0);
  const [page, setPage] = useState(1);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StockStatus>('All stock');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedSku, setSelectedSku] = useState('');
  const [quantityInput, setQuantityInput] = useState('');
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadInventoryPage() {
      try {
        setIsLoading(true);
        setErrorMessage('');
        setItems([]);
        const loadedPage = await fetchInventoryPage(page, { search: query, status });

        if (!isActive) {
          return;
        }

        setItems(loadedPage.items);
        setTotalMatchingItems(loadedPage.total);
        setSelectedSku(currentSku => currentSku || loadedPage.items[0]?.sku || '');
      } catch (error) {
        if (isActive) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadInventoryPage();

    return () => {
      isActive = false;
    };
  }, [page, query, status]);

  useEffect(() => {
    let isActive = true;

    async function loadRecentMovements() {
      try {
        const loadedMovements = await fetchStockMovements();
        if (isActive) {
          setMovements(loadedMovements);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(getErrorMessage(error));
        }
      }
    }

    void loadRecentMovements();

    return () => {
      isActive = false;
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalMatchingItems / INVENTORY_PAGE_SIZE));

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockCount = items.filter(
    item => item.quantity > 0 && item.quantity <= item.reorderPoint,
  ).length;
  const outOfStockCount = items.filter(item => item.quantity === 0).length;

  function updateSearch(value: string) {
    setQuery(value);
    setPage(1);
  }

  function updateStatus(value: StockStatus) {
    setStatus(value);
    setPage(1);
  }

  function openMovementDialog(mode: Exclude<ModalMode, null>, item?: InventoryItem) {
    if (items.length === 0) {
      return;
    }

    setSelectedSku(item?.sku ?? items[0].sku);
    setQuantityInput('');
    setReason('');
    setErrorMessage('');
    setModalMode(mode);
  }

  async function submitMovement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const quantity = Number(quantityInput);
    const selectedItem = items.find(item => item.sku === selectedSku);

    if (
      !modalMode
      || !selectedItem
      || !Number.isInteger(quantity)
      || quantity <= 0
      || !reason
    ) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const movement = await recordStockMovement(
        selectedItem.sku,
        modalMode,
        quantity,
        reason,
      );

      setItems(currentItems => currentItems.map(item => (
        item.sku === movement.sku
          ? { ...item, quantity: movement.quantityAfter }
          : item
      )));
      setMovements(currentMovements => [movement, ...currentMovements].slice(0, 5));
      setNotice(
        `${selectedItem.name}: stock ${modalMode === 'receive' ? 'received' : 'adjusted'} successfully.`,
      );
      setModalMode(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="inventory-app">
      <header className="inventory-header">
        <a
          className="inventory-brand"
          href="#overview"
          aria-label="Northstar inventory home"
        >
          <span className="inventory-logo">N</span>
          <span>
            northstar<span className="brand-muted"> / operations</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a className="nav-active" href="#inventory">Inventory</a>
          <a href="#activity">Activity</a>
          <a href="#learning">Learning lab</a>
        </nav>
        <button className="user-menu" aria-label="Signed in as Alex Morgan">
          AM <span>⌄</span>
        </button>
      </header>

      <main id="overview" className="inventory-main">
        <div className="page-heading">
          <div>
            <p className="overline">MONDAY, NOVEMBER 3, 2026 <span>·</span> TORONTO WAREHOUSE</p>
            <h1>Inventory overview</h1>
            <p className="page-description">
              A clear view of what’s on hand, what needs attention, and what changed.
            </p>
          </div>
          <button
            className="primary-action"
            disabled={isLoading || items.length === 0}
            onClick={() => openMovementDialog('receive')}
          >
            <span>＋</span> Receive stock
          </button>
        </div>

        {errorMessage && (
          <div className="inventory-error" role="alert">
            {errorMessage}
          </div>
        )}

        {notice && (
          <div className="inventory-notice" role="status">
            ✓ {notice}
            <button aria-label="Dismiss notification" onClick={() => setNotice('')}>
              ×
            </button>
          </div>
        )}

        <section className="metrics-grid" aria-label="Inventory summary">
          <MetricCard
            label="Total units on hand"
            value={totalUnits.toLocaleString()}
            change="On this page"
            icon="▤"
          />
          <MetricCard
            label="Items tracked"
            value={items.length.toLocaleString()}
            change="On this page"
            icon="#"
          />
          <MetricCard
            label="Low stock items"
            value={String(lowStockCount).padStart(2, '0')}
            change="On this page"
            icon="⌁"
            tone="warning"
          />
          <MetricCard
            label="Out of stock"
            value={String(outOfStockCount).padStart(2, '0')}
            change="On this page"
            icon="◌"
            tone="danger"
          />
        </section>

        <section id="inventory" className="inventory-panel">
          <div className="panel-heading">
            <div>
              <p className="overline">STOCK CONTROL</p>
              <h2>Items <span>{totalMatchingItems}</span></h2>
            </div>
            <button
              className="secondary-action"
              disabled={isLoading || items.length === 0}
              onClick={() => openMovementDialog('adjust')}
            >
              Adjust stock <span>↗</span>
            </button>
          </div>

          <div className="inventory-toolbar">
            <label className="inventory-search">
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="Search inventory"
                placeholder="Search name, SKU or category"
                value={query}
                onChange={event => updateSearch(event.target.value)}
              />
            </label>
            <label className="status-filter">
              <span>Status</span>
              <select
                aria-label="Stock status"
                value={status}
                onChange={event => updateStatus(event.target.value as StockStatus)}
              >
                {STOCK_STATUS_OPTIONS.map(option => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <button className="icon-action" aria-label="More inventory options">
              •••
            </button>
          </div>

          <div className="table-scroll">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th><input type="checkbox" aria-label="Select all items" /></th>
                  <th>Item</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>On hand</th>
                  <th>Reorder at</th>
                  <th>Status</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="table-empty">Loading inventory…</td>
                  </tr>
                )}
                {!isLoading && items.map(item => (
                  <InventoryRow
                    key={item.id}
                    item={item}
                    onAdjust={() => openMovementDialog('adjust', item)}
                  />
                ))}
                {!isLoading && items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="table-empty">
                      No inventory matches. Try a different search or status.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            <span>
              Showing{' '}
              <strong>{totalMatchingItems === 0 ? 0 : (page - 1) * INVENTORY_PAGE_SIZE + 1}</strong>
              {' '}to{' '}
              <strong>{Math.min(page * INVENTORY_PAGE_SIZE, totalMatchingItems)}</strong>
              {' '}of <strong>{totalMatchingItems}</strong> items
            </span>
            <div>
              <button
                aria-label="Previous page"
                disabled={isLoading || page === 1}
                onClick={() => setPage(currentPage => currentPage - 1)}
              >
                ←
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                aria-label="Next page"
                disabled={isLoading || page >= totalPages}
                onClick={() => setPage(currentPage => currentPage + 1)}
              >
                →
              </button>
            </div>
          </div>
        </section>

        <section id="activity" className="activity-panel">
          <div className="panel-heading">
            <div>
              <p className="overline">TRACEABILITY</p>
              <h2>Recent stock movements</h2>
            </div>
            <span className="link-action">Latest activity</span>
          </div>
          <div className="movement-list">
            {movements.map(movement => (
              <div className="movement-row" key={movement.id}>
                <span className={movement.change > 0
                  ? 'movement-icon received'
                  : 'movement-icon adjusted'}
                >
                  {movement.change > 0 ? '↓' : '↗'}
                </span>
                <div className="movement-details">
                  <strong>{movement.itemName}</strong>
                  <span>{movement.sku} <i>·</i> {movement.reason}</span>
                </div>
                <strong className={movement.change > 0
                  ? 'movement-quantity positive'
                  : 'movement-quantity'}
                >
                  {movement.change > 0 ? '+' : ''}{movement.change} units
                </strong>
                <time dateTime={movement.timestamp}>
                  {formatMovementTime(movement.timestamp)}
                </time>
              </div>
            ))}
            {!isLoading && movements.length === 0 && (
              <p className="movement-empty">No stock movements recorded yet.</p>
            )}
          </div>
        </section>

        <section id="learning" className="inventory-learning">
          <div>
            <p className="overline">THE QA FIELD GUIDE</p>
            <h2>Learn by testing<br /><em>the real work.</em></h2>
            <p>
              Practice inventory risks in this demo: reconcile counts, protect stock history,
              and catch reorder errors.
            </p>
          </div>
          <div className="learning-cards">
            <a href="#inventory">
              <span>01 · FOUNDATIONS</span>
              <strong>Map the inventory risks</strong>
              <small>Start with accuracy, traceability, and replenishment.</small>
            </a>
            <a href="#inventory">
              <span>02 · PLAYWRIGHT</span>
              <strong>Test a stock adjustment</strong>
              <small>Build a user journey with semantic locators.</small>
            </a>
            <a href="#activity">
              <span>03 · CI WORKFLOW</span>
              <strong>Review movement history</strong>
              <small>Practice assertions and failure diagnosis.</small>
            </a>
          </div>
        </section>
      </main>

      {modalMode && (
        <MovementDialog
          mode={modalMode}
          items={items}
          selectedSku={selectedSku}
          quantity={quantityInput}
          reason={reason}
          isSaving={isSaving}
          onSelect={setSelectedSku}
          onQuantityChange={setQuantityInput}
          onReasonChange={setReason}
          onClose={() => setModalMode(null)}
          onSubmit={submitMovement}
        />
      )}
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'The inventory service could not complete the request.';
}

function formatMovementTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function MetricCard({
  label,
  value,
  change,
  icon,
  tone = '',
}: {
  label: string;
  value: string;
  change: string;
  icon: string;
  tone?: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <span className={`metric-icon ${tone}`}>{icon}</span>
      </div>
      <strong className="metric-value">{value}</strong>
      <span className="metric-caption">{change}</span>
    </article>
  );
}

function InventoryRow({
  item,
  onAdjust,
}: {
  item: InventoryItem;
  onAdjust: () => void;
}) {
  const stockStatus = item.quantity === 0
    ? 'Out of stock'
    : item.quantity <= item.reorderPoint
      ? 'Low stock'
      : 'In stock';
  const statusClass = stockStatus.toLowerCase().replace(/ /g, '-');
  const displayedName = item.name.length > 50
    ? `${item.name.slice(0, 50)}...`
    : item.name;

  return (
    <tr>
      <td><input type="checkbox" aria-label={`Select ${item.name}`} /></td>
      <td>
        <div className="inventory-item">
          <span className="inventory-thumb">
            <img src={item.imageUrl} alt="" loading="lazy" />
          </span>
          <strong aria-label={item.name} title={item.name}>
            {displayedName}
          </strong>
        </div>
      </td>
      <td className="sku-cell">{item.sku}</td>
      <td>{item.category}</td>
      <td><strong>{item.quantity}</strong> <span className="unit-label">units</span></td>
      <td>{item.reorderPoint} units</td>
      <td>
        <span className={`stock-badge ${statusClass}`}>
          <i></i>{stockStatus}
        </span>
      </td>
      <td>
        <button className="row-menu" aria-label={`Adjust ${item.name}`} onClick={onAdjust}>
          •••
        </button>
      </td>
    </tr>
  );
}

function MovementDialog({
  mode,
  items,
  selectedSku,
  quantity,
  reason,
  isSaving,
  onSelect,
  onQuantityChange,
  onReasonChange,
  onClose,
  onSubmit,
}: {
  mode: Exclude<ModalMode, null>;
  items: InventoryItem[];
  selectedSku: string;
  quantity: string;
  reason: string;
  isSaving: boolean;
  onSelect: (sku: string) => void;
  onQuantityChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const quantityLabel = mode === 'receive' ? 'Quantity received' : 'Quantity to remove';
  const reasons = mode === 'receive'
    ? ['Purchase order received', 'Customer return', 'Transfer received']
    : ['Damaged goods', 'Cycle count correction', 'Lost or stolen', 'Write-off'];

  return (
    <div className="dialog-backdrop" role="presentation">
      <form
        className="movement-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="movement-title"
        onSubmit={onSubmit}
      >
        <button className="dialog-close" type="button" aria-label="Close" onClick={onClose}>
          ×
        </button>
        <p className="overline">INVENTORY CONTROL</p>
        <h2 id="movement-title">
          {mode === 'receive' ? 'Receive stock' : 'Adjust stock'}
        </h2>
        <p className="dialog-description">
          Record a stock movement with a reason so the item history stays clear.
        </p>
        <label>
          Item
          <select value={selectedSku} onChange={event => onSelect(event.target.value)}>
            {items.map(item => (
              <option key={item.sku} value={item.sku}>
                {item.name} · {item.sku} ({item.quantity} on hand)
              </option>
            ))}
          </select>
        </label>
        <label>
          {quantityLabel}
          <input
            type="number"
            min="1"
            step="1"
            required
            value={quantity}
            onChange={event => onQuantityChange(event.target.value)}
          />
        </label>
        <label>
          Reason
          <select
            required
            value={reason}
            onChange={event => onReasonChange(event.target.value)}
          >
            <option value="">Choose a reason</option>
            {reasons.map(option => <option key={option}>{option}</option>)}
          </select>
        </label>
        <div className="dialog-actions">
          <button type="button" className="dialog-cancel" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" className="primary-action" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save movement'}
          </button>
        </div>
      </form>
    </div>
  );
}
