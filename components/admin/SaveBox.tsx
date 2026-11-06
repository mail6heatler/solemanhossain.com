/**
 * The floating Save box on dashboard pages: the same card style as the Delete box, title on the left, buttons on the right.
 * `children` are the one or two buttons beside Save.
 */
export default function SaveBox({ label, desc = "Nothing goes live until you save.", children }: { label: string; desc?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="save-bar">
      <div className="grow">
        <div className="c-title">Save your changes</div>
        <div className="c-desc">{desc}</div>
      </div>
      <div className="save-btns">
        {children}
        <button className="b-mint"><i className="ti ti-device-floppy" />{label}</button>
      </div>
    </div>
  );
}
