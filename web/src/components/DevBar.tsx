import type { GradeBand, Subject } from "../App.tsx";

const GRADE_BANDS: GradeBand[] = ["K-2", "3-5", "6-8", "9-12", "undergrad", "grad"];
const SUBJECTS: Subject[] = ["math", "science", "writing"];

interface Props {
  gradeBand: GradeBand;
  subject: Subject;
  onGradeBand: (b: GradeBand) => void;
  onSubject: (s: Subject) => void;
  onReset: () => void;
}

export function DevBar(props: Props): JSX.Element {
  return (
    <div className="dev-bar" role="region" aria-label="Settings">
      <div
        className="segmented"
        role="radiogroup"
        aria-label="Subject"
      >
        {SUBJECTS.map((s) => {
          const active = props.subject === s;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={active}
              className={`segmented__item${active ? " is-active" : ""}`}
              onClick={() => props.onSubject(s)}
            >
              {s}
            </button>
          );
        })}
      </div>

      <div className="dev-bar__group">
        <span className="dev-bar__tag" aria-label="Developer mode">dev</span>
        <label className="dev-bar__field">
          <span>Grade</span>
          <div className="select">
            <select
              value={props.gradeBand}
              onChange={(e) => props.onGradeBand(e.target.value as GradeBand)}
              aria-label="Grade band"
            >
              {GRADE_BANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </label>
      </div>

      <button type="button" className="dev-bar__btn" onClick={props.onReset}>
        New conversation
      </button>
    </div>
  );
}
