interface Props { show: boolean }
export default function Loader({ show }: Props) {
  return show ? (
    <div className="loader-overlay active">
      <div className="loader-spinner" />
      <div className="loader-text">載入市場數據中…</div>
    </div>
  ) : null;
}
