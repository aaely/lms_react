import { Box } from "@mui/material"
import { type ReactNode } from "react"

interface Props<T> {
    suggestions: T[]
    onSelect:    (item: T) => void
    render:      (item: T) => ReactNode
}

/** The dropdown under an add-on's load or route field. Its parent must be position: relative. */
const SuggestionList = <T,>({ suggestions, onSelect, render }: Props<T>) => {
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
            {suggestions.map((item, i) => (
                <Box
                    key={i}
                    onClick={() => onSelect(item)}
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
                    {render(item)}
                </Box>
            ))}
        </Box>
    )
}

export default SuggestionList
