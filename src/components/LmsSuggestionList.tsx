import { Box } from "@mui/material"
import { type LMSRecord } from "../signals/signals"
import { lmsLabel } from "../utils/lmsLabel"

interface Props {
    suggestions: LMSRecord[]
    onSelect:    (record: LMSRecord) => void
    /** Name each load's route: a route prefix can match several. */
    showRoute?:  boolean
}

/** The dropdown under an add-on's load or route field. Its parent must be position: relative. */
const LmsSuggestionList = ({ suggestions, onSelect, showRoute = false }: Props) => {
    if (suggestions.length === 0) return null
    return (
        <Box sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 3,
            maxHeight: 240,
            overflowY: 'auto',
        }}>
            {suggestions.map((rec, i) => (
                <Box
                    key={i}
                    onClick={() => onSelect(rec)}
                    sx={{
                        px: 2, py: 1,
                        cursor: 'pointer',
                        fontSize: 13,
                        textAlign: 'left',
                        '&:hover': { bgcolor: 'action.hover' },
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    {lmsLabel(rec)}
                    {showRoute && <span style={{ color: '#888', marginLeft: 8 }}>{rec.route_id}</span>}
                </Box>
            ))}
        </Box>
    )
}

export default LmsSuggestionList
