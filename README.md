# BGC Processo Seletivo - Desafio 2
Projeto desenvolvido para fins avaliativos para um processo seletivo de uma vaga de estágio na BGC Brasil

# Tarefa

Criar um sistema que retorne os três primeiros produtos da página de mais vendidos da [Amazon](https://amazon.com.br/bestsellers) e disponibilizar essa informação para ser consumida por uma API, utilizando NodeJS/Typescript + AWS + Serverless Framework.

# Design

Obter esses dados através de técnicas de *web scraping* e disponibilizar os dados que serão armazenados em uma tabela no *DynamoDB* através de uma API.

## O quê caracteriza um produto?

Com uma análise simples da página de mais vendidos da Amazon é possível verificar que todo item tem:

- Foto
- Título
- Avaliação
- Preço

Para fins de simplicidade decidi escolher categorias específicas e obter os seguintes dados dos 3 produtos mais vendidos de cada categoria:

- Título
- Preço
- Posição no ranking

E para a categoria **livros** também escolhi obter o nome do autor que é uma informação relevante de um livro. As categorias escolhidas foram:

- [Computadores e Informática](https://amazon.com.br/bestsellers/computers)
- [Eletrônicos](https://amazon.com.br/bestsellers/electronics)
- [Games e Consoles](https://amazon.com.br/bestsellers/videogames)
- [Livros](https://amazon.com.br/bestsellers/books)

## Esquema do banco de dados

### Informações relevantes sobre o levantamento feito abaixo

- O *DynamoDB* utiliza *Unicode* com codificação UTF-8 o quê significa que um caracter de uma **String** no banco de dados pode ocupar de 1 a 4 bytes de memória e como utilizamos apenas caracteres comuns como letras, números e símbolos mais comuns é possível considerar que cada caracter ocupará apenas 1 byte.  
- Atributos do tipo **Number** são aproximadamente o tamanho do nome do atributo + 1 byte para cada 2 dígitos significativos + 1 byte.  
- A conta de quanto espaço ocupa um item no *DynamoDB* deve considerar os nomes dos atributos e os seus valores.

### Aproximação do espaço ocupado


Como o [AWS DynamoDB](https://docs.aws.amazon.com/dynamodb/) é um banco de dados NoSQL não é necessário existir um esquema pré estabelicdo *on write*, o que nos permite uma flexidade maior ao trabalhar com objetos com estruturas diferentes, que nesse caso seria os objetos de livros em comparação com os demais. Contudo, os objetos terão estruturas semelhantes e serão caracterizados da seguinte forma. Todos os objetos terão os campos:

- ***itemId:*** Será um *Universally Unique Identifier* (UUID) representado por uma **String** (42 bytes)
- ***title:*** Será uma **String** com o título do produto no site (75 bytes em média)
- ***price:*** Será um **Number** com o preço do produto armazenado como um número inteiro para evitar possíveis inconsistências, portanto sempre deverá ser usado tendo em mente que ele contém duas casas decimais (Difícil saber quantos bytes consome mas de acordo com alguns artigos uma boa aproximação pode ser 10 bytes)
- ***dateOfInsertion:*** Será uma **String** contendo o dia em que os produtos representam os mais vendidos no format **AAAA-MM-DD** (25 bytes)
- ***category:*** Será uma **String** com o nome da categoria do produto que poderá ser *books, electronics, videogames* ou *computers* (no máximo 19 bytes)
- ***rankingMarket:*** Será uma **String** contendo a posição no ranking do produto (14 bytes)

E os livros conterão, além dos campos descritos acima o campo *author* que terá em média *26 bytes*.

É complicado prever o espaço consumido pelo tipo **Number** em uma tabela no DynamoDB por isso decidi utilizar **String** para representar o *rankingMarket* pois é necessário apenas 1 digito e portanto não atrapalha tarefas de ordenação o que aconteceria caso representasse o preço como uma **String**, pois ao ser ordenado lexicograficamente em ordem não decrescente, por exemplo, permitiria que valores monetários maiores aparecerem antes de valores menores, pelo fato de, dessa forma, "1234567" que representa R$12345,67 aparecer antes que "987" que representa R$9,87.  
Com isso podemos prever que em média serão incluídos no banco de dados cerca de **2298 bytes por dia**, desconsiderando o espaço ocupado por indexes.


## Proposta para a aplicação

Ter um script que obtenha os dados do site da Amazon com uma certa frequência e os coloque em uma tabela no *DynamoDB* e disponibilizar uma API pelo *AWS API Gateway* que aciona uma *AWS Lambda Function* que faz a query no banco de dados e os retorna em JSON.

### Script de scrapping

Poderia ser uma *AWS Lambda Function* que é acionada por um evento periódico controlado pelo EventBridge ou então um script em uma máquina local que é acionado por um *cronjob*. Tendo em vista que um script de scrapping pode levar um tempo relativamente alto por utilizar navegadores headless e ter todo o overhead de abrir o navegador, executar a navegação e as respectivas queries e a cobrança em uma *AWS Lambda Function* acredito que seja mais simples e econômico utilizar *cronjob* para rodar o script de *scrapping*.

### API para consulta dos dados

É um endpoint que poderá conter parâmetros de *query* que serão usados para filtrar os dados da tabela, será possível utilizar 2 filtros, categoria e data de inserção, caso não seja passado nenhum dos dois parâmetros a API devolverá todos os items na tabela sem paginação, também é possível utilizar apenas um dos filtros por vez.

## Melhorias em potencial

- Refatoração do código quando estive mais experiente em JS
- Implementar paginação nos resultados da API
- Implementar algum tipo de restrição no acesso da API
- Implementação de algum método para tratar o input de título dos produtos da amazon que as vezes podem ser pouco específicos