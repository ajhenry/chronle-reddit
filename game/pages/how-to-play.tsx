import { useState } from 'react';
import { PlaceholdersAndVanishInput } from '../components/wordInput';
import { sendToDevvit } from '../utils';
import { useDevvitListener } from '../hooks/useDevvitListener';

export const PokemonPage = () => {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const pokemon = useDevvitListener('GET_POKEMON_RESPONSE');

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6">
      <PlaceholdersAndVanishInput
        placeholders={['Try ditto', 'Try pikachu', 'Try bulbasaur']}
        onChange={(e) => setValue(e.target.value)}
        onSubmit={() => {
          setLoading(true);
          sendToDevvit({
            type: 'GET_POKEMON_REQUEST',
            payload: { name: value.trim().toLowerCase() },
          });
        }}
      />
      {loading && !pokemon ? (
        <div className="text-center text-white">Loading...</div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4">
          <p className="text-white">Pokemon Number: {pokemon?.number}</p>
        </div>
      )}
    </div>
  );
};
