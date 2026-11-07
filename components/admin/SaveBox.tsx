/**
 * The floating Save box on dashboard pages: the same card style as the Delete box, title on the left, buttons on the right.
 * `children` are the one or two buttons beside Save. `still` stops it floating: it rests at the end of its form.
 * `form` names the form it saves when it can't sit inside it, as on an entry's page, where it rests right above the Delete box.
 */
export default function SaveBox({ label, desc = "Nothing goes live until you save.", still, form, children }: { label: string; desc?: React.ReactNode; still?: boolean; form?: string; children?: React.ReactNode }) {
  return (
    <div className={still ? "save-bar still" : "save-bar"}>
      <div className="grow">
        <div className="c-title">Save your changes</div>
        <div className="c-desc">{desc}</div>
      </div>
      <div className="save-btns">
        {children}
        <button className="b-mint" form={form}><i className="ti ti-device-floppy" />{label}</button>
      </div>
    </div>
  );
}
