export type CardSuit = '♠️' | '♣️' | '♥️' | '♦️' | 'JOKER';
export type CardRank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'JOKER';

export interface Card {
    id: string;
    suit: CardSuit;
    rank: CardRank;
    name: string; // The Persona name (e.g., "Cientista")
    imagePath: string;
}

export const BACK_OF_CARD_IMAGE = "/assets/cards/Anverso padrão.png";

export const DECK: Card[] = [
    // Spades (Espadas)
    { id: 's-10', suit: '♠️', rank: '10', name: 'Sócio', imagePath: '/assets/cards/♠️ 10 - Sócio.png' },
    { id: 's-2', suit: '♠️', rank: '2', name: 'Cientista', imagePath: '/assets/cards/♠️ 2 - Cientista.png' },
    { id: 's-3', suit: '♠️', rank: '3', name: 'Filósofo', imagePath: '/assets/cards/♠️ 3 - Filósofo.png' },
    { id: 's-4', suit: '♠️', rank: '4', name: 'Mestre', imagePath: '/assets/cards/♠️ 4 - Mestre.png' },
    { id: 's-5', suit: '♠️', rank: '5', name: 'Estrategista', imagePath: '/assets/cards/♠️ 5 - Estrategista.png' },
    { id: 's-6', suit: '♠️', rank: '6', name: 'Orquestrador', imagePath: '/assets/cards/♠️ 6 - Orquestrador.png' },
    { id: 's-7', suit: '♠️', rank: '7', name: 'Vidente', imagePath: '/assets/cards/♠️ 7 - Vidente.png' },
    { id: 's-8', suit: '♠️', rank: '8', name: 'Astrônomo', imagePath: '/assets/cards/♠️ 8 - Astrônomo.png' },
    { id: 's-9', suit: '♠️', rank: '9', name: 'Burguês', imagePath: '/assets/cards/♠️ 9 - Burguês.png' },
    { id: 's-a', suit: '♠️', rank: 'A', name: 'Mentor', imagePath: '/assets/cards/♠️ A - Mentor.png' },
    { id: 's-j', suit: '♠️', rank: 'J', name: 'Engenheiro', imagePath: '/assets/cards/♠️ J - Engenheiro.png' },
    { id: 's-k', suit: '♠️', rank: 'K', name: 'Guru', imagePath: '/assets/cards/♠️ K - Guru.png' },
    { id: 's-q', suit: '♠️', rank: 'Q', name: 'Cigana', imagePath: '/assets/cards/♠️ Q - Cigana.png' },

    // Clubs (Paus)
    { id: 'c-10', suit: '♣️', rank: '10', name: 'Arauto', imagePath: '/assets/cards/♣️ 10 - Arauto.png' },
    { id: 'c-2', suit: '♣️', rank: '2', name: 'Executor', imagePath: '/assets/cards/♣️ 2 - Executor.png' },
    { id: 'c-3', suit: '♣️', rank: '3', name: 'Mordomo', imagePath: '/assets/cards/♣️ 3 - Mordomo.png' },
    { id: 'c-4', suit: '♣️', rank: '4', name: 'Treinador', imagePath: '/assets/cards/♣️ 4 - Treinador.png' },
    { id: 'c-5', suit: '♣️', rank: '5', name: 'Aprovisionador', imagePath: '/assets/cards/♣️ 5 - Aprovisionador.png' },
    { id: 'c-6', suit: '♣️', rank: '6', name: 'Instrutor', imagePath: '/assets/cards/♣️ 6 - Instrutor.png' },
    { id: 'c-7', suit: '♣️', rank: '7', name: 'Médico', imagePath: '/assets/cards/♣️ 7 - Médico.png' },
    { id: 'c-8', suit: '♣️', rank: '8', name: 'Guardião', imagePath: '/assets/cards/♣️ 8 - Guardião.png' },
    { id: 'c-9', suit: '♣️', rank: '9', name: 'Bruto', imagePath: '/assets/cards/♣️ 9 - Bruto.png' },
    { id: 'c-a', suit: '♣️', rank: 'A', name: 'Vigia', imagePath: '/assets/cards/♣️ A - Vigia.png' },
    { id: 'c-j', suit: '♣️', rank: 'J', name: 'Adjunto', imagePath: '/assets/cards/♣️ J - Adjunto.png' },
    { id: 'c-k', suit: '♣️', rank: 'K', name: 'Inimigo', imagePath: '/assets/cards/♣️ K - Inimigo.png' },
    { id: 'c-q', suit: '♣️', rank: 'Q', name: 'Comandante', imagePath: '/assets/cards/♣️ Q - Comandante.png' },

    // Hearts (Copas)
    { id: 'h-10', suit: '♥️', rank: '10', name: 'Luz', imagePath: '/assets/cards/♥️ 10 - Luz.png' },
    { id: 'h-2', suit: '♥️', rank: '2', name: 'Terapeuta', imagePath: '/assets/cards/♥️ 2 - Terapeuta.png' },
    { id: 'h-3', suit: '♥️', rank: '3', name: 'Confessor', imagePath: '/assets/cards/♥️ 3 - Confessor.png' },
    { id: 'h-4', suit: '♥️', rank: '4', name: 'Espelho', imagePath: '/assets/cards/♥️ 4 - Espelho.png' },
    { id: 'h-5', suit: '♥️', rank: '5', name: 'Sombra', imagePath: '/assets/cards/♥️ 5 - Sombra.png' },
    { id: 'h-6', suit: '♥️', rank: '6', name: 'Dor', imagePath: '/assets/cards/♥️ 6 - Dor.png' },
    { id: 'h-7', suit: '♥️', rank: '7', name: 'Desejo', imagePath: '/assets/cards/♥️ 7 - Desejo.png' },
    { id: 'h-8', suit: '♥️', rank: '8', name: 'Vingador', imagePath: '/assets/cards/♥️ 8 - Vingador.png' },
    { id: 'h-9', suit: '♥️', rank: '9', name: 'Fúria', imagePath: '/assets/cards/♥️ 9 - Fúria.png' },
    { id: 'h-a', suit: '♥️', rank: 'A', name: 'Psicólogo', imagePath: '/assets/cards/♥️ A - Psicólogo.png' },
    { id: 'h-j', suit: '♥️', rank: 'J', name: 'Herdeiro', imagePath: '/assets/cards/♥️ J - Herdeiro.png' },
    { id: 'h-k', suit: '♥️', rank: 'K', name: 'Autor', imagePath: '/assets/cards/♥️ K - Autor.png' },
    { id: 'h-q', suit: '♥️', rank: 'Q', name: 'Princesa', imagePath: '/assets/cards/♥️ Q - Princesa.png' },

    // Diamonds (Ouros)
    { id: 'd-10', suit: '♦️', rank: '10', name: 'Exorcista', imagePath: '/assets/cards/♦️ 10 - Exorcista.png' },
    { id: 'd-2', suit: '♦️', rank: '2', name: 'Artista', imagePath: '/assets/cards/♦️ 2 - Artista.png' },
    { id: 'd-3', suit: '♦️', rank: '3', name: 'Narrador', imagePath: '/assets/cards/♦️ 3 - Narrador.png' },
    { id: 'd-4', suit: '♦️', rank: '4', name: 'Vazio', imagePath: '/assets/cards/♦️ 4 - Vazio.png' },
    { id: 'd-5', suit: '♦️', rank: '5', name: 'Mentorzinho', imagePath: '/assets/cards/♦️ 5 - Mentorzinho.png' },
    { id: 'd-6', suit: '♦️', rank: '6', name: 'Custódio', imagePath: '/assets/cards/♦️ 6 - Custódio.png' },
    { id: 'd-7', suit: '♦️', rank: '7', name: 'Espião', imagePath: '/assets/cards/♦️ 7 - Espião.png' },
    { id: 'd-8', suit: '♦️', rank: '8', name: 'Bruxo', imagePath: '/assets/cards/♦️ 8 - Bruxo.png' },
    { id: 'd-9', suit: '♦️', rank: '9', name: 'Arqueólogo', imagePath: '/assets/cards/♦️ 9 - Arqueólogo.png' },
    { id: 'd-a', suit: '♦️', rank: 'A', name: 'Curador', imagePath: '/assets/cards/♦️ A - Curador.png' },
    { id: 'd-j', suit: '♦️', rank: 'J', name: 'Promotor', imagePath: '/assets/cards/♦️ J - Promotor.png' },
    { id: 'd-k', suit: '♦️', rank: 'K', name: 'Juiz', imagePath: '/assets/cards/♦️ K - Juiz.png' },
    { id: 'd-q', suit: '♦️', rank: 'Q', name: 'Advogado', imagePath: '/assets/cards/♦️ Q - Advogado.png' },

    // Jokers
    { id: 'j-bobo', suit: 'JOKER', rank: 'JOKER', name: 'Bobo', imagePath: '/assets/cards/JOKER - Bobo.png' },
    { id: 'j-coveiro', suit: 'JOKER', rank: 'JOKER', name: 'Coveiro', imagePath: '/assets/cards/JOKER - Coveiro.png' },
    { id: 'j-fantasma', suit: 'JOKER', rank: 'JOKER', name: 'Fantasma', imagePath: '/assets/cards/JOKER - Fantasma.png' },
    { id: 'j-louco', suit: 'JOKER', rank: 'JOKER', name: 'Louco', imagePath: '/assets/cards/JOKER - Louco.png' },
];

export function shuffleDeck(deck: Card[]): Card[] {
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
}
