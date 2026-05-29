"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import InstitutionalFooter from "@/app/components/InstitutionalFooter";
import MedievalButton from "@/app/components/MedievalButton";
import { useLanguage } from "@/app/components/LanguageProvider";

type PieceType = "p" | "r" | "n" | "b" | "q" | "k";
type PieceColor = "w" | "b";

interface Piece {
    type: PieceType;
    color: PieceColor;
    hasMoved?: boolean;
}

interface SquareCoord {
    r: number;
    c: number;
}

interface Move {
    from: SquareCoord;
    to: SquareCoord;
}

interface GameHistoryState {
    board: (Piece | null)[][];
    lastMove: Move | null;
    isCheck: boolean;
    clock: number;
}

// Initial board setup
const INITIAL_BOARD: (Piece | null)[][] = [
    [
        { type: "r", color: "b", hasMoved: false },
        { type: "n", color: "b", hasMoved: false },
        { type: "b", color: "b", hasMoved: false },
        { type: "q", color: "b", hasMoved: false },
        { type: "k", color: "b", hasMoved: false },
        { type: "b", color: "b", hasMoved: false },
        { type: "n", color: "b", hasMoved: false },
        { type: "r", color: "b", hasMoved: false }
    ],
    Array(8).fill(null).map(() => ({ type: "p", color: "b", hasMoved: false })),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null).map(() => ({ type: "p", color: "w", hasMoved: false })),
    [
        { type: "r", color: "w", hasMoved: false },
        { type: "n", color: "w", hasMoved: false },
        { type: "b", color: "w", hasMoved: false },
        { type: "q", color: "w", hasMoved: false },
        { type: "k", color: "w", hasMoved: false },
        { type: "b", color: "w", hasMoved: false },
        { type: "n", color: "w", hasMoved: false },
        { type: "r", color: "w", hasMoved: false }
    ]
];

const UNICODE_PIECES: Record<PieceType, string> = {
    k: "♚",
    q: "♛",
    r: "♜",
    b: "♝",
    n: "♞",
    p: "♟"
};

const PIECE_NAMES_PT: Record<PieceType, string> = {
    k: "Rei",
    q: "Rainha",
    r: "Torre",
    b: "Bispo",
    n: "Cavalo",
    p: "Peão"
};

const PIECE_NAMES_EN: Record<PieceType, string> = {
    k: "King",
    q: "Queen",
    r: "Rook",
    b: "Bishop",
    n: "Knight",
    p: "Pawn"
};

export default function ChessGamePage() {
    const { t, language } = useLanguage();
    const [isEmbedded, setIsEmbedded] = useState(false);
    useEffect(() => {
        if (typeof window !== "undefined") {
            setIsEmbedded(window.location.search.includes("embed=true") || window.self !== window.top);
        }
    }, []);

    const [board, setBoard] = useState<(Piece | null)[][]>(INITIAL_BOARD);
    const [selectedSquare, setSelectedSquare] = useState<SquareCoord | null>(null);
    const [turn, setTurn] = useState<PieceColor>("w");
    const [lastMove, setLastMove] = useState<Move | null>(null);
    const [isCheck, setIsCheck] = useState<boolean>(false);
    const [isCheckmate, setIsCheckmate] = useState<boolean>(false);
    const [isDraw, setIsDraw] = useState<boolean>(false);
    
    // Timer clock (10 minutes)
    const [clock, setClock] = useState<number>(600);
    const [isThinking, setIsThinking] = useState<boolean>(false);
    
    // Powers & History
    const [powerUsesLeft, setPowerUsesLeft] = useState<number>(4);
    const [history, setHistory] = useState<GameHistoryState[]>([]);
    
    // Active power indicators
    const [counselMove, setCounselMove] = useState<Move | null>(null);
    const [revealedMove, setRevealedMove] = useState<Move | null>(null);
    const [timeWarpActive, setTimeWarpActive] = useState<boolean>(false);
    
    // Dialogue system
    const [enemyDialogue, setEnemyDialogue] = useState<string>("");

    const isPt = language.startsWith("pt");

    // Dynamic dialogue choices
    const ENEMY_DIALOGUES = {
        start: isPt 
            ? "Então você ousa desafiar a si mesmo no tabuleiro do destino? Mostre-me seu foco." 
            : "So you dare challenge yourself on the board of destiny? Show me your focus.",
        check: isPt
            ? "Seu Rei treme... A queda é inevitável."
            : "Your King trembles... Fall is inevitable.",
        playerCapture: [
            isPt ? "Uma perda irrelevante. Fazia parte do meu plano..." : "An irrelevant loss. It was part of my plan...",
            isPt ? "Você captura meus guerreiros enquanto cerco sua mente." : "You capture my warriors while I surround your mind.",
            isPt ? "Um avanço ousado. Mas seus flancos estão abertos." : "A bold advance. But your flanks are open."
        ],
        enemyCapture: [
            isPt ? "Seus recursos estão esgotando. Um sacrifício previsível." : "Your resources are draining. A predictable sacrifice.",
            isPt ? "Mais uma alma perdida nas sombras." : "Another soul lost in the shadows.",
            isPt ? "Essa peça não lhe fará mais falta." : "You won't be needing that piece anymore."
        ],
        checkmatePlayer: isPt
            ? "Impossível! A luz superou minhas sombras... Por enquanto."
            : "Impossible! The light overcame my shadows... For now.",
        checkmateEnemy: isPt
            ? "Como eu previ. A escuridão sempre prevalece sobre a dúvida."
            : "As I predicted. Darkness always prevails over doubt.",
        powerUsed: isPt
            ? "Trapaças e feitiçaria? Você é fraco demais para lutar sozinho."
            : "Tricks and sorcery? You are too weak to fight alone.",
        undoUsed: isPt
            ? "Brincando com o tempo? Isso não mudará seu trágico fim..."
            : "Playing with time? That won't change your tragic end..."
    };

    // Initialize dialogue
    useEffect(() => {
        setEnemyDialogue(ENEMY_DIALOGUES.start);
    }, [language]);

    // Timer Ticker
    useEffect(() => {
        if (isCheckmate || isDraw || isThinking) return;
        const interval = setInterval(() => {
            setClock((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setIsCheckmate(true);
                    setEnemyDialogue(isPt ? "Seu tempo expirou na ampulheta do destino!" : "Your time expired in the hourglass of destiny!");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isCheckmate, isDraw, isThinking]);

    // Helpers
    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    const getSquareName = (r: number, c: number): string => {
        const file = ["A", "B", "C", "D", "E", "F", "G", "H"][c];
        const rank = 8 - r;
        return `${file}${rank}`;
    };

    const deepCopyBoard = (b: (Piece | null)[][]): (Piece | null)[][] => {
        return b.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
    };

    // --- Chess engine logic ---
    
    // Checks if a square is under attack by any piece of attackerColor
    const isSquareAttacked = (row: number, col: number, attackerColor: PieceColor, b: (Piece | null)[][]): boolean => {
        // 1. Knight jumps
        const knightOffsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [dr, dc] of knightOffsets) {
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const p = b[r][c];
                if (p && p.type === "n" && p.color === attackerColor) return true;
            }
        }

        // 2. Sliders: Rook & Queen
        const straightDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of straightDirs) {
            let r = row + dr;
            let c = col + dc;
            while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const p = b[r][c];
                if (p) {
                    if (p.color === attackerColor && (p.type === "r" || p.type === "q")) return true;
                    break;
                }
                r += dr;
                c += dc;
            }
        }

        // 3. Sliders: Bishop & Queen
        const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        for (const [dr, dc] of diagDirs) {
            let r = row + dr;
            let c = col + dc;
            while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const p = b[r][c];
                if (p) {
                    if (p.color === attackerColor && (p.type === "b" || p.type === "q")) return true;
                    break;
                }
                r += dr;
                c += dc;
            }
        }

        // 4. Pawns
        const pawnDir = attackerColor === "w" ? 1 : -1;
        const pr = row + pawnDir;
        for (const pc of [col - 1, col + 1]) {
            if (pr >= 0 && pr < 8 && pc >= 0 && pc < 8) {
                const p = b[pr][pc];
                if (p && p.type === "p" && p.color === attackerColor) return true;
            }
        }

        // 5. King
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = row + dr;
                const c = col + dc;
                if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                    const p = b[r][c];
                    if (p && p.type === "k" && p.color === attackerColor) return true;
                }
            }
        }

        return false;
    };

    const isKingInCheck = (color: PieceColor, b: (Piece | null)[][]): boolean => {
        let kingRow = -1;
        let kingCol = -1;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = b[r][c];
                if (p && p.type === "k" && p.color === color) {
                    kingRow = r;
                    kingCol = c;
                    break;
                }
            }
        }
        if (kingRow === -1) return false;
        const opponentColor = color === "w" ? "b" : "w";
        return isSquareAttacked(kingRow, kingCol, opponentColor, b);
    };

    const getPseudoLegalMoves = (row: number, col: number, b: (Piece | null)[][]): SquareCoord[] => {
        const piece = b[row][col];
        if (!piece) return [];
        const color = piece.color;
        const opponentColor = color === "w" ? "b" : "w";
        const moves: SquareCoord[] = [];

        switch (piece.type) {
            case "p": {
                const dir = color === "w" ? -1 : 1;
                const startRow = color === "w" ? 6 : 1;
                
                // Forward moves
                const r1 = row + dir;
                if (r1 >= 0 && r1 < 8 && !b[r1][col]) {
                    moves.push({ r: r1, c: col });
                    
                    const r2 = row + 2 * dir;
                    if (row === startRow && !b[r2][col]) {
                        moves.push({ r: r2, c: col });
                    }
                }
                
                // Diagonals
                for (const dc of [-1, 1]) {
                    const tc = col + dc;
                    if (r1 >= 0 && r1 < 8 && tc >= 0 && tc < 8) {
                        const targetPiece = b[r1][tc];
                        if (targetPiece && targetPiece.color === opponentColor) {
                            moves.push({ r: r1, c: tc });
                        }
                    }
                }
                break;
            }
            case "n": {
                const offsets = [
                    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                    [1, -2], [1, 2], [2, -1], [2, 1]
                ];
                for (const [dr, dc] of offsets) {
                    const r = row + dr;
                    const c = col + dc;
                    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                        const p = b[r][c];
                        if (!p || p.color === opponentColor) {
                            moves.push({ r, c });
                        }
                    }
                }
                break;
            }
            case "r": {
                const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                for (const [dr, dc] of dirs) {
                    let r = row + dr;
                    let c = col + dc;
                    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                        const p = b[r][c];
                        if (!p) {
                            moves.push({ r, c });
                        } else {
                            if (p.color === opponentColor) moves.push({ r, c });
                            break;
                        }
                        r += dr;
                        c += dc;
                    }
                }
                break;
            }
            case "b": {
                const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
                for (const [dr, dc] of dirs) {
                    let r = row + dr;
                    let c = col + dc;
                    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                        const p = b[r][c];
                        if (!p) {
                            moves.push({ r, c });
                        } else {
                            if (p.color === opponentColor) moves.push({ r, c });
                            break;
                        }
                        r += dr;
                        c += dc;
                    }
                }
                break;
            }
            case "q": {
                const dirs = [
                    [-1, 0], [1, 0], [0, -1], [0, 1],
                    [-1, -1], [-1, 1], [1, -1], [1, 1]
                ];
                for (const [dr, dc] of dirs) {
                    let r = row + dr;
                    let c = col + dc;
                    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                        const p = b[r][c];
                        if (!p) {
                            moves.push({ r, c });
                        } else {
                            if (p.color === opponentColor) moves.push({ r, c });
                            break;
                        }
                        r += dr;
                        c += dc;
                    }
                }
                break;
            }
            case "k": {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const r = row + dr;
                        const c = col + dc;
                        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                            const p = b[r][c];
                            if (!p || p.color === opponentColor) {
                                moves.push({ r, c });
                            }
                        }
                    }
                }
                break;
            }
        }

        return moves;
    };

    const getLegalMoves = (row: number, col: number, b: (Piece | null)[][]): SquareCoord[] => {
        const piece = b[row][col];
        if (!piece) return [];
        const color = piece.color;
        const opponentColor = color === "w" ? "b" : "w";

        const pseudo = getPseudoLegalMoves(row, col, b);
        const legal = pseudo.filter((m) => {
            const nextBoard = deepCopyBoard(b);
            nextBoard[m.r][m.c] = nextBoard[row][col];
            nextBoard[row][col] = null;
            return !isKingInCheck(color, nextBoard);
        });

        // Castling support for King
        if (piece.type === "k" && !piece.hasMoved && !isKingInCheck(color, b)) {
            const kingRow = color === "w" ? 7 : 0;
            if (col === 4) {
                // Kingside castle
                const rRook = b[kingRow][7];
                if (rRook && rRook.type === "r" && !rRook.hasMoved) {
                    if (!b[kingRow][5] && !b[kingRow][6]) {
                        if (!isSquareAttacked(kingRow, 5, opponentColor, b) && 
                            !isSquareAttacked(kingRow, 6, opponentColor, b)) {
                            legal.push({ r: kingRow, c: 6 });
                        }
                    }
                }

                // Queenside castle
                const lRook = b[kingRow][0];
                if (lRook && lRook.type === "r" && !lRook.hasMoved) {
                    if (!b[kingRow][1] && !b[kingRow][2] && !b[kingRow][3]) {
                        if (!isSquareAttacked(kingRow, 2, opponentColor, b) && 
                            !isSquareAttacked(kingRow, 3, opponentColor, b)) {
                            legal.push({ r: kingRow, c: 2 });
                        }
                    }
                }
            }
        }

        return legal;
    };

    const getAllLegalMoves = (color: PieceColor, b: (Piece | null)[][]): Move[] => {
        const list: Move[] = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = b[r][c];
                if (p && p.color === color) {
                    const targets = getLegalMoves(r, c, b);
                    for (const t of targets) {
                        list.push({ from: { r, c }, to: t });
                    }
                }
            }
        }
        return list;
    };

    const executeMoveOnBoard = (from: SquareCoord, to: SquareCoord, currentBoard: (Piece | null)[][]): (Piece | null)[][] => {
        const nextBoard = deepCopyBoard(currentBoard);
        const p = nextBoard[from.r][from.c];
        if (!p) return currentBoard;

        let movingPiece = { ...p, hasMoved: true };
        
        // Auto-promote pawn to Queen when reaching the absolute edge
        if (movingPiece.type === "p" && (to.r === 0 || to.r === 7)) {
            movingPiece.type = "q";
        }

        // Apply castling move shift for Rook
        if (p.type === "k" && Math.abs(to.c - from.c) === 2) {
            const kingRow = p.color === "w" ? 7 : 0;
            if (to.c === 6) {
                const rook = nextBoard[kingRow][7];
                if (rook) {
                    nextBoard[kingRow][5] = { ...rook, hasMoved: true };
                    nextBoard[kingRow][7] = null;
                }
            } else if (to.c === 2) {
                const rook = nextBoard[kingRow][0];
                if (rook) {
                    nextBoard[kingRow][3] = { ...rook, hasMoved: true };
                    nextBoard[kingRow][0] = null;
                }
            }
        }

        nextBoard[to.r][to.c] = movingPiece;
        nextBoard[from.r][from.c] = null;
        return nextBoard;
    };

    // --- Minimax AI algorithm ---
    const evaluateBoard = (b: (Piece | null)[][]): number => {
        let score = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = b[r][c];
                if (p) {
                    let val = 0;
                    switch (p.type) {
                        case "p": val = 10; break;
                        case "n": val = 30; break;
                        case "b": val = 30; break;
                        case "r": val = 50; break;
                        case "q": val = 90; break;
                        case "k": val = 9000; break;
                    }

                    // Positional bonuses: Center control
                    if ((r === 3 || r === 4) && (c === 3 || c === 4)) {
                        val += 2;
                    }

                    // Encourage pawn push
                    if (p.type === "p") {
                        if (p.color === "b") {
                            val += r * 0.2;
                        } else {
                            val += (7 - r) * 0.2;
                        }
                    }

                    if (p.color === "b") {
                        score += val;
                    } else {
                        score -= val;
                    }
                }
            }
        }
        return score;
    };

    const minimax = (b: (Piece | null)[][], depth: number, alpha: number, beta: number, isMaximizing: boolean): number => {
        if (depth === 0) {
            return evaluateBoard(b);
        }

        const activeColor = isMaximizing ? "b" : "w";
        const moves = getAllLegalMoves(activeColor, b);

        if (moves.length === 0) {
            if (isKingInCheck(activeColor, b)) {
                return isMaximizing ? -Infinity : Infinity;
            }
            return 0; // Draw
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const m of moves) {
                const nb = executeMoveOnBoard(m.from, m.to, b);
                const ev = minimax(nb, depth - 1, alpha, beta, false);
                maxEval = Math.max(maxEval, ev);
                alpha = Math.max(alpha, ev);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const m of moves) {
                const nb = executeMoveOnBoard(m.from, m.to, b);
                const ev = minimax(nb, depth - 1, alpha, beta, true);
                minEval = Math.min(minEval, ev);
                beta = Math.min(beta, ev);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    };

    const getBestAIMove = (currentBoard: (Piece | null)[][]): Move | null => {
        const moves = getAllLegalMoves("b", currentBoard);
        if (moves.length === 0) return null;

        let bestScore = -Infinity;
        const bestMoves: Move[] = [];

        for (const m of moves) {
            const nb = executeMoveOnBoard(m.from, m.to, currentBoard);
            const score = minimax(nb, 1, -Infinity, Infinity, false); // depth 1 + current = depth 2!

            if (score > bestScore) {
                bestScore = score;
                bestMoves.length = 0;
                bestMoves.push(m);
            } else if (score === bestScore) {
                bestMoves.push(m);
            }
        }

        if (bestMoves.length === 0) return null;
        // Introduce tiny unpredictable randomness
        const idx = Math.floor(Math.random() * bestMoves.length);
        return bestMoves[idx];
    };

    // Suggests best move for White (Estrategista advice)
    const getBestWhiteMove = (currentBoard: (Piece | null)[][]): Move | null => {
        const moves = getAllLegalMoves("w", currentBoard);
        if (moves.length === 0) return null;

        let bestScore = Infinity; // minimize black's advantages
        const bestMoves: Move[] = [];

        for (const m of moves) {
            const nb = executeMoveOnBoard(m.from, m.to, currentBoard);
            const score = minimax(nb, 1, -Infinity, Infinity, true);

            if (score < bestScore) {
                bestScore = score;
                bestMoves.length = 0;
                bestMoves.push(m);
            } else if (score === bestScore) {
                bestMoves.push(m);
            }
        }

        if (bestMoves.length === 0) return null;
        const idx = Math.floor(Math.random() * bestMoves.length);
        return bestMoves[idx];
    };

    // --- Interactive click handlers ---
    const handleSquareClick = (r: number, c: number) => {
        if (isThinking || isCheckmate || isDraw || turn !== "w") return;

        const piece = board[r][c];

        // 1. Selecting one of Player's pieces
        if (piece && piece.color === "w") {
            setSelectedSquare({ r, c });
            return;
        }

        // 2. Making a move
        if (selectedSquare) {
            const legalTargets = getLegalMoves(selectedSquare.r, selectedSquare.c, board);
            const isValid = legalTargets.some((m) => m.r === r && m.c === c);

            if (isValid) {
                const sourcePiece = board[selectedSquare.r][selectedSquare.c];
                const captured = board[r][c];

                // Save to history before executing
                const snapshot: GameHistoryState = {
                    board: deepCopyBoard(board),
                    lastMove,
                    isCheck,
                    clock
                };
                setHistory((prev) => [...prev, snapshot]);

                const nextBoard = executeMoveOnBoard(selectedSquare, { r, c }, board);
                setBoard(nextBoard);
                setLastMove({ from: selectedSquare, to: { r, c } });
                setSelectedSquare(null);
                setCounselMove(null);
                setRevealedMove(null);
                setTurn("b");

                // Evaluate player's capture commentary
                if (captured) {
                    const dialogue = ENEMY_DIALOGUES.playerCapture[
                        Math.floor(Math.random() * ENEMY_DIALOGUES.playerCapture.length)
                    ];
                    setEnemyDialogue(dialogue);
                }

                // Check opponent state
                const nextCheck = isKingInCheck("b", nextBoard);
                if (nextCheck) {
                    const blackLegal = getAllLegalMoves("b", nextBoard);
                    if (blackLegal.length === 0) {
                        setIsCheckmate(true);
                        setEnemyDialogue(ENEMY_DIALOGUES.checkmatePlayer);
                        return;
                    }
                }

                // Trigger AI Turn
                setIsThinking(true);
                setTimeout(() => {
                    setBoard((currentBoard) => {
                        const aiMove = getBestAIMove(currentBoard);
                        if (aiMove) {
                            const aiPiece = currentBoard[aiMove.from.r][aiMove.from.c];
                            const aiCaptured = currentBoard[aiMove.to.r][aiMove.to.c];

                            const afterAIBoard = executeMoveOnBoard(aiMove.from, aiMove.to, currentBoard);
                            setLastMove(aiMove);
                            setTurn("w");
                            setIsThinking(false);

                            // Capture remarks
                            if (aiCaptured) {
                                const remark = ENEMY_DIALOGUES.enemyCapture[
                                    Math.floor(Math.random() * ENEMY_DIALOGUES.enemyCapture.length)
                                ];
                                setEnemyDialogue(remark);
                            }

                            // Check player checks
                            const playerCheck = isKingInCheck("w", afterAIBoard);
                            setIsCheck(playerCheck);
                            if (playerCheck) {
                                const whiteLegal = getAllLegalMoves("w", afterAIBoard);
                                if (whiteLegal.length === 0) {
                                    setIsCheckmate(true);
                                    setEnemyDialogue(ENEMY_DIALOGUES.checkmateEnemy);
                                } else {
                                    setEnemyDialogue(ENEMY_DIALOGUES.check);
                                }
                            }
                            return afterAIBoard;
                        } else {
                            // Stalemate or draw
                            setIsDraw(true);
                            setEnemyDialogue(isPt ? "Um empate glorioso sob a dança do conselho." : "A glorious draw under the dance of the council.");
                            setIsThinking(false);
                            return currentBoard;
                        }
                    });
                }, 1000);
            } else {
                // Clicked an invalid cell, deselect
                setSelectedSquare(null);
            }
        }
    };

    // --- Persona power invocation triggers ---
    const usePowerCard = (powerName: "cigana" | "arauto" | "estrategista" | "bruxo") => {
        if (powerUsesLeft <= 0 || isThinking || isCheckmate || isDraw) return;

        setPowerUsesLeft((prev) => prev - 1);
        setEnemyDialogue(ENEMY_DIALOGUES.powerUsed);

        switch (powerName) {
            case "cigana": {
                // Revela a melhor jogada do Inimigo agora
                const predicted = getBestAIMove(board);
                if (predicted) {
                    setRevealedMove(predicted);
                    const piece = board[predicted.from.r][predicted.from.c];
                    const name = isPt ? PIECE_NAMES_PT[piece!.type] : PIECE_NAMES_EN[piece!.type];
                    setEnemyDialogue(
                        isPt 
                            ? `A Cigana sussurra: O Inimigo planeja mover o ${name} de ${getSquareName(predicted.from.r, predicted.from.c)} para ${getSquareName(predicted.to.r, predicted.to.c)}!`
                            : `The Gypsy whispers: The Enemy plans to move the ${name} from ${getSquareName(predicted.from.r, predicted.from.c)} to ${getSquareName(predicted.to.r, predicted.to.c)}!`
                    );
                }
                break;
            }
            case "arauto": {
                // Adds +60 seconds to player clock
                setClock((prev) => prev + 60);
                setEnemyDialogue(
                    isPt
                        ? "O Arauto soa o gongo imperial! Tempo de reflexão estendido em 60 segundos."
                        : "The Herald sounds the imperial gong! Reflection time extended by 60 seconds."
                );
                break;
            }
            case "estrategista": {
                // Highlights best move for White
                const best = getBestWhiteMove(board);
                if (best) {
                    setCounselMove(best);
                    const piece = board[best.from.r][best.from.c];
                    const name = isPt ? PIECE_NAMES_PT[piece!.type] : PIECE_NAMES_EN[piece!.type];
                    setEnemyDialogue(
                        isPt
                            ? `O Estrategista instrui: A jogada ideal é mover o ${name} de ${getSquareName(best.from.r, best.from.c)} para ${getSquareName(best.to.r, best.to.c)}.`
                            : `The Strategist instructs: The optimal move is to move the ${name} from ${getSquareName(best.from.r, best.from.c)} to ${getSquareName(best.to.r, best.to.c)}.`
                    );
                }
                break;
            }
            case "bruxo": {
                // Desfazer (Undo) time warp
                if (history.length > 0) {
                    setTimeWarpActive(true);
                    setTimeout(() => {
                        setHistory((currentHistory) => {
                            const lastState = currentHistory[currentHistory.length - 1];
                            setBoard(lastState.board);
                            setLastMove(lastState.lastMove);
                            setIsCheck(lastState.isCheck);
                            setClock(lastState.clock);
                            setTurn("w");
                            setSelectedSquare(null);
                            setCounselMove(null);
                            setRevealedMove(null);
                            setTimeWarpActive(false);
                            return currentHistory.slice(0, -1);
                        });
                        setEnemyDialogue(ENEMY_DIALOGUES.undoUsed);
                    }, 400);
                } else {
                    setEnemyDialogue(isPt ? "As areias do tempo já estão estáticas no início!" : "The sands of time are already static at the start!");
                    setPowerUsesLeft((prev) => prev + 1); // Refund power card usage
                }
                break;
            }
        }
    };

    const resetGame = () => {
        setBoard(INITIAL_BOARD);
        setSelectedSquare(null);
        setTurn("w");
        setLastMove(null);
        setIsCheck(false);
        setIsCheckmate(false);
        setIsDraw(false);
        setClock(600);
        setPowerUsesLeft(4);
        setHistory([]);
        setCounselMove(null);
        setRevealedMove(null);
        setEnemyDialogue(ENEMY_DIALOGUES.start);
    };

    return (
        <main className={`nemosine-main-container min-h-screen relative overflow-hidden transition-all duration-300 ${timeWarpActive ? "blur-[1.5px] scale-[0.99] duration-75" : ""} ${isEmbedded ? "p-0 overflow-y-auto" : ""}`}>
            {!isEmbedded && (
                <div className="sticky top-0 z-50">
                    <Navbar />
                </div>
            )}

            {/* Timeless background graphics */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="nemosine-bg-overlay absolute inset-0 z-10"></div>
                <div className="nemosine-mental-castle-bg w-full h-full bg-[url('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=2000')] bg-cover bg-center"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-8 md:py-12 flex flex-col items-center">
                <header className="mb-8 text-center">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-[#c5a059]/60 font-semibold block mb-1">
                        {isPt ? "Desafio Cognitivo" : "Cognitive Challenge"}
                    </span>
                    <h1 className="mb-2 font-display text-4xl uppercase tracking-widest text-[#c5a059]">
                        {isPt ? "Xadrez contra o Inimigo" : "Chess against the Enemy"}
                    </h1>
                    <p className="font-body text-base italic text-[#c5a059]/60 max-w-xl mx-auto">
                        {isPt 
                            ? "Enfrente as sombras da sua própria mente oculta em uma batalha de pura estratégia medieval"
                            : "Face the shadows of your own hidden mind in a battle of pure medieval strategy"}
                    </p>
                </header>

                <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-4">
                    {/* LEFT COLUMN: Dialogue Box & Clock */}
                    <div className="lg:col-span-3 flex flex-col gap-6 w-full">
                        {/* Hourglass & Player Timer */}
                        <div className="glass-medieval border border-[#c5a059]/30 rounded-2xl p-5 bg-black/60 relative overflow-hidden flex flex-col items-center justify-center text-center">
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#c5a059]/40"></div>
                            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#c5a059]/40"></div>
                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#c5a059]/40"></div>
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#c5a059]/40"></div>
                            
                            <span className="material-icons text-3xl text-amber-500 animate-spin-slow mb-2">hourglass_empty</span>
                            <span className="text-[9px] uppercase tracking-widest text-[#c5a059]/60 font-bold block mb-1">
                                {isPt ? "Tempo de Reflexão" : "Reflection Timer"}
                            </span>
                            <span className="font-mono text-4xl font-bold tracking-widest text-[#fde68a] drop-shadow-[0_0_10px_rgba(253,230,138,0.2)]">
                                {formatTime(clock)}
                            </span>
                            <div className="mt-3 flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-semibold">
                                <span className={`w-2 h-2 rounded-full ${turn === "w" && !isThinking ? "bg-emerald-500 animate-ping" : "bg-stone-600"}`}></span>
                                <span className={turn === "w" && !isThinking ? "text-emerald-400" : "text-stone-500"}>
                                    {turn === "w" && !isThinking ? (isPt ? "Seu Turno" : "Your Turn") : (isPt ? "Aguardando Inimigo" : "Awaiting Enemy")}
                                </span>
                            </div>
                        </div>

                        {/* Enemy Portrait & Speech Bubble */}
                        <div className="glass-medieval border border-stone-800 rounded-2xl p-5 bg-gradient-to-b from-[#121115] to-[#080709] relative flex flex-col items-center">
                            <div className="w-18 h-18 rounded-full border-2 border-stone-700 bg-stone-950 flex items-center justify-center relative overflow-hidden shadow-inner group mb-4">
                                <div className="absolute inset-0 bg-[#7c2d12]/10 mix-blend-overlay"></div>
                                <span className="text-4xl filter drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]">👤</span>
                                <div className="absolute bottom-0 inset-x-0 h-4 bg-black/60 flex items-center justify-center">
                                    <span className="text-[7.5px] uppercase tracking-wider font-bold text-amber-500">{isPt ? "INIMIGO" : "ENEMY"}</span>
                                </div>
                            </div>
                            
                            <div className="w-full bg-black/40 border border-stone-800 rounded-xl p-4 min-h-[120px] flex flex-col justify-between relative">
                                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 border-x-8 border-x-transparent border-b-8 border-b-black/40"></span>
                                <p className="font-body text-xs italic leading-relaxed text-[#eee8dc]/85 text-center flex-1 flex items-center justify-center">
                                    {isThinking ? (
                                        <span className="flex items-center gap-1.5 text-stone-500 tracking-widest uppercase text-[9px] animate-pulse">
                                            {isPt ? "Inimigo calculando..." : "Enemy calculating..."}
                                        </span>
                                    ) : `“${enemyDialogue}”`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CENTER COLUMN: Chess Board */}
                    <div className="lg:col-span-6 flex flex-col items-center justify-center w-full">
                        {/* Status overlays for Game Over */}
                        <div className="relative w-full max-w-[500px]">
                            {(isCheckmate || isDraw) && (
                                <div className="absolute inset-0 bg-black/85 border border-[#c5a059]/40 backdrop-blur-md rounded-2xl z-40 flex flex-col items-center justify-center p-8 text-center animate-fade-in shadow-[0_0_30px_rgba(0,0,0,0.95)]">
                                    <span className="text-5xl mb-4">⚜️</span>
                                    <h2 className="font-display text-2xl uppercase tracking-widest text-[#c5a059] mb-2">
                                        {isCheckmate 
                                            ? (turn === "w" ? (isPt ? "FIM DE JOGO" : "GAME OVER") : (isPt ? "VITÓRIA!" : "VICTORY!"))
                                            : (isPt ? "EMPATE" : "DRAW")}
                                    </h2>
                                    <p className="font-body text-sm text-[#eee8dc]/75 max-w-xs mb-6">
                                        {isCheckmate 
                                            ? (turn === "w" 
                                                ? (isPt ? "Você sucumbiu à escuridão da própria mente." : "You succumbed to the darkness of your own mind.")
                                                : (isPt ? "Você iluminou suas sombras e derrotou o Inimigo." : "You illuminated your shadows and defeated the Enemy."))
                                            : (isPt ? "As forças estão em perfeito equilíbrio." : "Forces are in perfect balance.")}
                                    </p>
                                    <MedievalButton onClick={resetGame} className="text-xs py-3 px-8">
                                        {isPt ? "Jogar Novamente" : "Play Again"}
                                    </MedievalButton>
                                </div>
                            )}

                            {/* Chessboard frame */}
                            <div className="relative border-4 border-[#c5a059] rounded-2xl p-2 bg-[#121115] shadow-2xl flex flex-col items-center">
                                {/* Top Rank Coordinates Labels */}
                                <div className="flex w-full justify-around text-[#c5a059]/60 font-display text-[9px] font-bold py-1 px-4">
                                    {["A", "B", "C", "D", "E", "F", "G", "H"].map((l) => (
                                        <span key={l} className="w-10 sm:w-12 text-center">{l}</span>
                                    ))}
                                </div>

                                <div className="flex w-full">
                                    {/* Left File Coordinates Labels */}
                                    <div className="flex flex-col justify-around text-[#c5a059]/60 font-display text-[9px] font-bold px-1 py-1">
                                        {["8", "7", "6", "5", "4", "3", "2", "1"].map((n) => (
                                            <span key={n} className="h-10 sm:h-12 flex items-center justify-center w-3">{n}</span>
                                        ))}
                                    </div>

                                    {/* The Board Matrix */}
                                    <div className="grid grid-cols-8 grid-rows-8 gap-0 border border-[#c5a059]/25 flex-1 relative bg-stone-900 rounded overflow-hidden select-none">
                                        {board.map((rowArr, rIdx) =>
                                            rowArr.map((piece, cIdx) => {
                                                const isLight = (rIdx + cIdx) % 2 === 0;
                                                const isSelected = selectedSquare?.r === rIdx && selectedSquare?.c === cIdx;
                                                
                                                // Verify if this square is a pseudo legal move target
                                                const legalTargets = selectedSquare ? getLegalMoves(selectedSquare.r, selectedSquare.c, board) : [];
                                                const isLegalTarget = legalTargets.some((m) => m.r === rIdx && m.c === cIdx);
                                                
                                                // Highlights
                                                const isLastMoveSrc = lastMove?.from.r === rIdx && lastMove?.from.c === cIdx;
                                                const isLastMoveDest = lastMove?.to.r === rIdx && lastMove?.to.c === cIdx;
                                                
                                                const isCounselSrc = counselMove?.from.r === rIdx && counselMove?.from.c === cIdx;
                                                const isCounselDest = counselMove?.to.r === rIdx && counselMove?.to.c === cIdx;
                                                
                                                const isRevealedSrc = revealedMove?.from.r === rIdx && revealedMove?.from.c === cIdx;
                                                const isRevealedDest = revealedMove?.to.r === rIdx && revealedMove?.to.c === cIdx;

                                                return (
                                                    <button
                                                        key={`${rIdx}-${cIdx}`}
                                                        onClick={() => handleSquareClick(rIdx, cIdx)}
                                                        className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center relative transition-colors duration-250 cursor-pointer focus:outline-none 
                                                            ${isLight ? "bg-[#f5efe5]" : "bg-[#1c1917]"}
                                                            ${isSelected ? "bg-amber-500/35 ring-2 ring-amber-500/60 z-20" : ""}
                                                            ${isLastMoveDest ? "bg-amber-600/20" : ""}
                                                            ${isLastMoveSrc ? "bg-amber-600/10" : ""}
                                                            ${isCounselSrc || isCounselDest ? "bg-emerald-500/20 animate-pulse border border-emerald-500/40" : ""}
                                                            ${isRevealedSrc || isRevealedDest ? "bg-blue-500/25 border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]" : ""}
                                                        `}
                                                    >
                                                        {/* Target hint circle */}
                                                        {isLegalTarget && (
                                                            <div className="absolute w-3.5 h-3.5 rounded-full bg-[#c5a059]/40 border border-[#c5a059]/80 z-10 flex items-center justify-center">
                                                                <div className="w-1 h-1 rounded-full bg-[#fff]/60"></div>
                                                            </div>
                                                        )}

                                                        {/* Render Piece as metallic seal coin */}
                                                        {piece && (
                                                            <div
                                                                className={`w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold transition-all relative z-10 shadow-lg border-[1.5px] select-none
                                                                    ${piece.color === "w"
                                                                        ? "bg-gradient-to-br from-[#d4af37] via-[#f5e0a0] to-[#b8860b] text-stone-900 border-[#fff]/45 shadow-[0_3px_6px_rgba(197,160,89,0.35)] hover:scale-105 active:scale-95"
                                                                        : "bg-gradient-to-br from-[#334155] via-[#64748b] to-[#1e293b] text-stone-100 border-stone-500/35 shadow-[0_3px_6px_rgba(0,0,0,0.5)]"
                                                                    }
                                                                `}
                                                            >
                                                                <span className="drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.4)]">
                                                                    {UNICODE_PIECES[piece.type]}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Right File Coordinates Labels */}
                                    <div className="flex flex-col justify-around text-[#c5a059]/60 font-display text-[9px] font-bold px-1 py-1">
                                        {["8", "7", "6", "5", "4", "3", "2", "1"].map((n) => (
                                            <span key={n} className="h-10 sm:h-12 flex items-center justify-center w-3">{n}</span>
                                        ))}
                                    </div>
                                </div>

                                {/* Bottom Rank Coordinates Labels */}
                                <div className="flex w-full justify-around text-[#c5a059]/60 font-display text-[9px] font-bold py-1 px-4">
                                    {["A", "B", "C", "D", "E", "F", "G", "H"].map((l) => (
                                        <span key={l} className="w-10 sm:w-12 text-center">{l}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Utility Controls */}
                        <div className="flex gap-4 mt-6">
                            <MedievalButton onClick={resetGame} variant="secondary" className="text-[10px] tracking-wider py-2.5 px-6">
                                {isPt ? "Reiniciar Tabuleiro" : "Reset Board"}
                            </MedievalButton>
                            {!isEmbedded && (
                                <Link href="/space/games">
                                    <MedievalButton variant="secondary" className="text-[10px] tracking-wider py-2.5 px-6">
                                        {isPt ? "Voltar ao Hub" : "Back to Hub"}
                                    </MedievalButton>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Persona cards side cards */}
                    <div className="lg:col-span-3 flex flex-col gap-5 w-full">
                        {/* Power Counter HUD */}
                        <div className="glass-medieval border border-[#c5a059]/30 rounded-2xl px-5 py-4 bg-gradient-to-r from-[#0c0d12]/95 to-[#1a1b24]/95 text-center">
                            <span className="text-[8px] uppercase tracking-widest text-[#c5a059]/65 font-bold block mb-1">
                                {isPt ? "Cartas do Conselho Ativas" : "Active Council Cards"}
                            </span>
                            <h3 className="font-display text-base font-bold uppercase tracking-widest text-[#fde68a] flex items-center justify-center gap-2">
                                <span className="material-icons text-sm animate-bounce text-amber-500">auto_awesome</span>
                                {powerUsesLeft} {isPt ? "Acionamentos" : "Triggers"} {isPt ? "Restantes" : "Remaining"}
                            </h3>
                            <p className="text-[8px] italic text-[#eee8dc]/40 mt-1">
                                {isPt ? "Use com cautela para dobrar as regras mentais" : "Use carefully to bend cognitive rules"}
                            </p>
                        </div>

                        {/* Grid/Stack of Power Cards */}
                        <div className="flex flex-col gap-4">
                            {/* CIGANA */}
                            <button
                                type="button"
                                disabled={powerUsesLeft <= 0 || isThinking}
                                onClick={() => usePowerCard("cigana")}
                                className="group relative text-left w-full border border-blue-500/20 bg-gradient-to-b from-[#0b0c10] to-[#07080b] p-4.5 rounded-xl transition-all duration-300 hover:border-blue-500/60 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-display text-xs uppercase tracking-widest text-blue-400 group-hover:text-blue-300 font-bold">
                                        {isPt ? "A Cigana" : "The Gypsy"}
                                    </h4>
                                    <span className="text-xl">🔮</span>
                                </div>
                                <p className="text-[9.5px] text-[#eee8dc]/70 leading-relaxed">
                                    {isPt 
                                        ? "Revelação: Antecipa e exibe a próxima melhor jogada que o Inimigo fará."
                                        : "Revelation: Predicts and displays the next optimal move of the Enemy."}
                                </p>
                            </button>

                            {/* ARAUTO */}
                            <button
                                type="button"
                                disabled={powerUsesLeft <= 0 || isThinking}
                                onClick={() => usePowerCard("arauto")}
                                className="group relative text-left w-full border border-amber-500/20 bg-gradient-to-b from-[#0e0c09] to-[#080705] p-4.5 rounded-xl transition-all duration-300 hover:border-amber-500/60 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-display text-xs uppercase tracking-widest text-amber-400 group-hover:text-amber-300 font-bold">
                                        {isPt ? "O Arauto" : "The Herald"}
                                    </h4>
                                    <span className="text-xl">📯</span>
                                </div>
                                <p className="text-[9.5px] text-[#eee8dc]/70 leading-relaxed">
                                    {isPt
                                        ? "Tempo Extra: Proclama o gongo e adiciona +60 segundos ao seu relógio."
                                        : "Extra Time: Proclaims the gong, adding +60 seconds to your clock."}
                                </p>
                            </button>

                            {/* ESTRATEGISTA */}
                            <button
                                type="button"
                                disabled={powerUsesLeft <= 0 || isThinking}
                                onClick={() => usePowerCard("estrategista")}
                                className="group relative text-left w-full border border-emerald-500/20 bg-gradient-to-b from-[#090b0a] to-[#050706] p-4.5 rounded-xl transition-all duration-300 hover:border-emerald-500/60 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-display text-xs uppercase tracking-widest text-emerald-400 group-hover:text-emerald-300 font-bold">
                                        {isPt ? "O Estrategista" : "The Strategist"}
                                    </h4>
                                    <span className="text-xl">🧭</span>
                                </div>
                                <p className="text-[9.5px] text-[#eee8dc]/70 leading-relaxed">
                                    {isPt
                                        ? "Conselho: Analisa o tabuleiro e destaca a melhor jogada que você pode fazer."
                                        : "Advice: Analyzes the board and highlights the best possible move you can play."}
                                </p>
                            </button>

                            {/* BRUXO */}
                            <button
                                type="button"
                                disabled={powerUsesLeft <= 0 || isThinking || history.length === 0}
                                onClick={() => usePowerCard("bruxo")}
                                className="group relative text-left w-full border border-purple-500/20 bg-gradient-to-b from-[#0c0a10] to-[#07050a] p-4.5 rounded-xl transition-all duration-300 hover:border-purple-500/60 hover:shadow-[0_0_15px_rgba(168,85,247,0.15)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500"></div>
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-display text-xs uppercase tracking-widest text-purple-400 group-hover:text-purple-300 font-bold">
                                        {isPt ? "O Bruxo" : "The Warlock"}
                                    </h4>
                                    <span className="text-xl">🔮</span>
                                </div>
                                <p className="text-[9.5px] text-[#eee8dc]/70 leading-relaxed">
                                    {isPt
                                        ? "Distorção Temporal: Desfaz o último movimento da rodada inteira (Undo)."
                                        : "Time Warp: Undoes the last movement of the entire round (Undo)."}
                                </p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {!isEmbedded && <InstitutionalFooter />}
        </main>
    );
}
