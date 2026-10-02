export interface AirportItem {
 iata: string;
 name: string;
 city: string;
 state: string;
 country: string;
 isPopular?: boolean;
}

export const CANONICAL_AIRPORTS: AirportItem[] = [
 // Sul do Brasil
 { iata: "XAP", name: "Aeroporto Serafin Enoss Bertaso", city: "Chapecó", state: "SC", country: "Brasil", isPopular: true },
 { iata: "FLN", name: "Aeroporto Internacional Hercílio Luz", city: "Florianópolis", state: "SC", country: "Brasil", isPopular: true },
 { iata: "NVT", name: "Aeroporto Internacional de Navegantes", city: "Navegantes / Baln. Camboriú", state: "SC", country: "Brasil", isPopular: true },
 { iata: "JOI", name: "Aeroporto Lauro Carneiro de Loyola", city: "Joinville", state: "SC", country: "Brasil" },
 { iata: "CWB", name: "Aeroporto Internacional Afonso Pena", city: "Curitiba", state: "PR", country: "Brasil", isPopular: true },
 { iata: "IGU", name: "Aeroporto Internacional de Foz do Iguaçu", city: "Foz do Iguaçu", state: "PR", country: "Brasil", isPopular: true },
 { iata: "LDB", name: "Aeroporto Governador José Richa", city: "Londrina", state: "PR", country: "Brasil" },
 { iata: "POA", name: "Aeroporto Internacional Salgado Filho", city: "Porto Alegre", state: "RS", country: "Brasil", isPopular: true },
 { iata: "CXJ", name: "Aeroporto Regional Hugo Cantergiani", city: "Caxias do Sul / Gramado", state: "RS", country: "Brasil", isPopular: true },
 { iata: "PFB", name: "Aeroporto Lauro Kortz", city: "Passo Fundo", state: "RS", country: "Brasil" },

 // Sudeste
 { iata: "GRU", name: "Aeroporto Internacional de Guarulhos", city: "São Paulo", state: "SP", country: "Brasil", isPopular: true },
 { iata: "CGH", name: "Aeroporto de Congonhas", city: "São Paulo", state: "SP", country: "Brasil", isPopular: true },
 { iata: "VCP", name: "Aeroporto Internacional de Viracopos", city: "Campinas", state: "SP", country: "Brasil", isPopular: true },
 { iata: "SDU", name: "Aeroporto Santos Dumont", city: "Rio de Janeiro", state: "RJ", country: "Brasil", isPopular: true },
 { iata: "GIG", name: "Aeroporto Internacional do Galeão", city: "Rio de Janeiro", state: "RJ", country: "Brasil", isPopular: true },
 { iata: "CNF", name: "Aeroporto Internacional de Confins", city: "Belo Horizonte", state: "MG", country: "Brasil", isPopular: true },
 { iata: "VIX", name: "Aeroporto de Vitória - Eurico de Aguiar Salles", city: "Vitória", state: "ES", country: "Brasil" },

 // Centro-Oeste
 { iata: "BSB", name: "Aeroporto Internacional Presidente Juscelino Kubitschek", city: "Brasília", state: "DF", country: "Brasil", isPopular: true },
 { iata: "GYN", name: "Aeroporto Santa Genoveva", city: "Goiânia", state: "GO", country: "Brasil" },
 { iata: "CGB", name: "Aeroporto Internacional Marechal Rondon", city: "Cuiabá", state: "MT", country: "Brasil" },
 { iata: "CGR", name: "Aeroporto Internacional de Campo Grande", city: "Campo Grande / Bonito", state: "MS", country: "Brasil", isPopular: true },

 // Nordeste
 { iata: "SSA", name: "Aeroporto Internacional de Salvador", city: "Salvador", state: "BA", country: "Brasil", isPopular: true },
 { iata: "BPS", name: "Aeroporto de Porto Seguro", city: "Porto Seguro", state: "BA", country: "Brasil", isPopular: true },
 { iata: "REC", name: "Aeroporto Internacional dos Guararapes", city: "Recife / Porto de Galinhas", state: "PE", country: "Brasil", isPopular: true },
 { iata: "FOR", name: "Aeroporto Internacional Pinto Martins", city: "Fortaleza / Jericoacoara", state: "CE", country: "Brasil", isPopular: true },
 { iata: "NAT", name: "Aeroporto Internacional de Natal", city: "Natal / Pipa", state: "RN", country: "Brasil", isPopular: true },
 { iata: "MCZ", name: "Aeroporto Internacional Zumbi dos Palmares", city: "Maceió / Maragogi", state: "AL", country: "Brasil", isPopular: true },
 { iata: "JPA", name: "Aeroporto Internacional Presidente Castro Pinto", city: "João Pessoa", state: "PB", country: "Brasil" },
 { iata: "AJU", name: "Aeroporto Internacional Santa Maria", city: "Aracaju", state: "SE", country: "Brasil" },
 { iata: "SLZ", name: "Aeroporto Internacional Marechal Cunha Machado", city: "São Luís / Lençóis", state: "MA", country: "Brasil" },

 // Norte
 { iata: "MAO", name: "Aeroporto Internacional Eduardo Gomes", city: "Manaus", state: "AM", country: "Brasil", isPopular: true },
 { iata: "BEL", name: "Aeroporto Internacional de Val-de-Cans", city: "Belém", state: "PA", country: "Brasil" },

 // Internacionais Mais Buscados
 { iata: "MCO", name: "Orlando International Airport", city: "Orlando (Disney)", state: "FL", country: "Estados Unidos", isPopular: true },
 { iata: "MIA", name: "Miami International Airport", city: "Miami", state: "FL", country: "Estados Unidos", isPopular: true },
 { iata: "JFK", name: "John F. Kennedy International Airport", city: "Nova York", state: "NY", country: "Estados Unidos", isPopular: true },
 { iata: "LIS", name: "Aeroporto Humberto Delgado", city: "Lisboa", state: "Lisboa", country: "Portugal", isPopular: true },
 { iata: "OPO", name: "Aeroporto Francisco Sá Carneiro", city: "Porto", state: "Porto", country: "Portugal" },
 { iata: "MAD", name: "Aeropuerto Adolfo Suárez Madrid-Barajas", city: "Madrid", state: "Madrid", country: "Espanha", isPopular: true },
 { iata: "CDG", name: "Aéroport de Paris-Charles-de-Gaulle", city: "Paris", state: "Île-de-France", country: "França", isPopular: true },
 { iata: "FCO", name: "Aeroporto di Roma-Fiumicino", city: "Roma", state: "Lazio", country: "Itália", isPopular: true },
 { iata: "EZE", name: "Aeropuerto Internacional Ministro Pistarini", city: "Buenos Aires", state: "BA", country: "Argentina", isPopular: true },
 { iata: "SCL", name: "Aeropuerto Internacional Arturo Merino Benítez", city: "Santiago", state: "RM", country: "Chile", isPopular: true },
 { iata: "PUJ", name: "Punta Cana International Airport", city: "Punta Cana", state: "La Altagracia", country: "Rep. Dominicana", isPopular: true },
 { iata: "CUN", name: "Cancún International Airport", city: "Cancún", state: "Quintana Roo", country: "México", isPopular: true },
];

export function searchAirports(query: string): AirportItem[] {
 if (!query || !query.trim()) return CANONICAL_AIRPORTS.filter((a) => a.isPopular);
 const q = query.toLowerCase().trim();
 return CANONICAL_AIRPORTS.filter(
 (a) =>
 a.iata.toLowerCase().includes(q) ||
 a.city.toLowerCase().includes(q) ||
 a.state.toLowerCase().includes(q) ||
 a.country.toLowerCase().includes(q) ||
 a.name.toLowerCase().includes(q)
 );
}
