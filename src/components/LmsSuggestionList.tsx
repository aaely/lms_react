import { type LMSRecord } from "../signals/signals"
import { lmsLabel } from "../utils/lmsLabel"
import SuggestionList from "./SuggestionList"

interface Props {
    suggestions: LMSRecord[]
    onSelect:    (record: LMSRecord) => void
    /** Name each load's route: a route prefix can match several. */
    showRoute?:  boolean
}

/** The dropdown under an add-on's load or route field. Its parent must be position: relative. */
const LmsSuggestionList = ({ suggestions, onSelect, showRoute = false }: Props) => (
    <SuggestionList
        suggestions={suggestions}
        onSelect={onSelect}
        render={rec => <>
            {lmsLabel(rec)}
            {showRoute && <span style={{ color: '#888', marginLeft: 8 }}>{rec.route_id}</span>}
        </>}
    />
)

export default LmsSuggestionList
