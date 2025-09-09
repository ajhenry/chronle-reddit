# Algorithm for secure solution validation for TopX

## Game setup

There is a cap of 8 correct answers for a topx game. Most games will have less than 8, probably 4 or 5.
these answers are sorted by position.

## Client-side validation

The client needs to know which one of the positions are correct.

1. We generate a map of all possible positions that could be correct.

   For example, if the solution is ["A", "B", "C"], the map would be:

   [A, null, null]
   [A, B, null]
   [A, B, C]
   [null, B, null]
   [null, B, C]
   [null, null, C]
   [A, null, C]

2. For each of these, we generate a sha256 hash.

   [A, null, null] -> sha256("A|null|null")
   [A, B, null] -> sha256("A|B|null")
   [A, B, C] -> sha256("A|B|C")
   [null, B, null] -> sha256("null|B|null")
   [null, B, C] -> sha256("null|B|C")
   [null, null, C] -> sha256("null|null|C")
   [A, null, C] -> sha256("A|null|C")

3. We store the hash in the database.

4. When the client submits an answer, we hash the answer and check if it exists in the solution hash.

5. If it does, we know that the answer is correct. We can also get the position of the answer from the hash.

6. If it doesn't, we know that the answer is incorrect.

7. We update the client with the correct answer and position.
