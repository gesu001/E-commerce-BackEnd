const router = require('express').Router();
const { Tag, Product, ProductTag } = require('../../models');

// The `/api/tags` endpoint
// find all tags
router.get('/', async (req, res) => {
  try {
    const tagData = await Tag.findAll({
        // include its associated Product data
      include: [{ model: Tag, through: ProductTag, as: 'tag_products' }]
    });
    res.status(200).json(tagData);
  } catch (err) {
    res.status(500).json(err);
  }
});

 // find a single tag by its `id`
router.get('/:id', async (req, res) => {
  try {
    const tagData = await Tag.findByPk(req.params.id, {
      // include its associated Product data
    include: [{ model: Tag, through: ProductTag, as: 'tag_products' }]
  });

  if(!tagData) {
    res.status(404).json({ message: 'No product found with this id!' });
    return;
  }
  res.status(200).json(tagData);

  } catch (err) {
    res.status(500).json(err);
  }
});

  // create a new tag
router.post('/', async (req, res) => {
/*   req.body should look like this...
  {
    tag_name: ""
    productIds: [1, 2, 3, 4]
  } 
  */
  Tag.create(req.body)
  .then((tag) => {
    // if there's tag products, create pairings to bulk create in the ProductTag model
    if (req.body.productIds.length) {
      const tagProductIdArr = req.body.productIds.map((product_id) => {
        return {
          tag_id: tag.id,
          product_id,
        };
      });
      console.log(tagProductIdArr);
      return ProductTag.bulkCreate(tagProductIdArr);
    }
    // if no tag products, just respond
    res.status(200).json(tag);
  })
  .then((tagProductIds) => res.status(200).json(tagProductIds))
  .catch((err) => {
    console.log(err);
    res.status(400).json(err);
  });
});

// update a tag's name by its `id` value
router.put('/:id', (req, res) => {
  Tag.update(req.body, {
    where: {
      id: req.params.id,
    },
  })
  .then((tag) => {
    if (req.body.productIds && req.body.productIds.length) {
      ProductTag.findAll({
        where: { tag_id: req.params.id }
      })
      .then((tagProducts) => {
        // create filtered list of new product_ids
        const tagProductIds = tagProducts.map(({ product_id }) => product_id);
        const newTagProducts = req.body.productIds.filter((product_id) => !tagProductIds.includes(product_id)).map((product_id) => {
          return {
            tag_id: req.params.id,
            product_id,
          };
        });
        // figure out which ones to remove
        const tagProductsToRemove = tagProducts.filter(({ product_id }) => !req.body.productIds.includes(product_id)).map(({ id }) => id);
        // run both actions
        return Promise.all([
          ProductTag.destroy({ where: { id: tagProductsToRemove }}),
          ProductTag.bulkCreate(newTagProducts),
        ]);
      });
    }
    return res.json(tags);
  })
  .catch((err) => {
    res.status(400).json(err);
  });
});

// delete on tag by its `id` value
router.delete('/:id', async (req, res) => {
  try {
    const tagData = await Tag.destroy({
      where: {
        id: req.params.id
      }
    });

    if (!tagData) {
      res.status(404).json({ message: 'No tag found with this id!' });
      return;
    }

    res.status(200).json(tagData);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
